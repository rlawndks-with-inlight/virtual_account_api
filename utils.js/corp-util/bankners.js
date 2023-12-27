import axios from 'axios';
import 'dotenv/config';
import crypto from 'crypto';
import https from 'https';

const API_URL = process.env.NODE_ENV == 'production' ? "api.bankners.com" : "stgapi.bankners.com";

const makeHeaderData = (dns_data, pay_type, decode_user) => {
    let cur_time = new Date().getTime();
    let req_uniq_no = `${cur_time}${dns_data?.id}${decode_user?.id}`;
    let api_sign_val = crypto.createHash('sha256').update(`${dns_data[`${pay_type}_api_id`]}${req_uniq_no}${dns_data[`${pay_type}_sign_key`]}`).digest('hex');
    return {
        'Content-Type': 'application/json',
        'api_id': dns_data[`${pay_type}_api_id`],
        'api_sign_val': api_sign_val,
        'req_uniq_no': req_uniq_no,
    }
}
function encryptAES256(text, ENCR_KEY, IV) {
    let encr_key = Buffer.from(ENCR_KEY, 'hex');
    let iv = Buffer.from(IV, 'hex');
    let cipher = crypto.createCipheriv('aes-256-cbc', encr_key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    encrypted = encrypted.toString('hex').replace(/^"|"$/g, '');

    return encrypted;
}

function decryptAES256(encryptedText, ENCR_KEY, IV) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCR_KEY, 'hex'), Buffer.from(IV, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}
const makeBody = (query_, dns_data, pay_type) => {
    let query = query_;
    const encryptedRequestBody = encryptAES256(JSON.stringify(query), dns_data[`${pay_type}_encr_key`], dns_data[`${pay_type}_iv`]);
    return encryptedRequestBody;
}

const postRequest = async (uri, query, headers_data, method = 'POST') => {
    const options = {
        hostname: API_URL,
        port: 443, // SSL 포트 443
        path: uri,
        method: method,
        headers: {
            ...headers_data,
            'Content-Length': Buffer.byteLength(query)
        }
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(typeof data)
                resolve(JSON.parse(data));
            });
        });

        req.on('error', (e) => {
            console.log(e)
            reject(`Error: ${e.message}`);
        });

        req.write(query);
        req.end();
    });
}


export const banknersApi = {
    user: {
        info: async (data) => {
            try {
                let { dns_data, pay_type, decode_user, guid } = data;
                let query = {
                    guid: guid
                }
                query = new URLSearchParams(query).toString();
                let { data: result } = await axios.get(`https://${API_URL}/api/user/info?${query}`, {
                    headers: makeHeaderData(dns_data, pay_type, decode_user)
                })
                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                result.data = decryptAES256(result.data, dns_data[`${pay_type}_encr_key`], dns_data[`${pay_type}_iv`])
                result.data = JSON.parse(result.data);
                return {
                    code: 100,
                    message: result?.message,
                    data: result.data,
                };
            } catch (err) {
                console.log(err);
                return {
                    code: -100,
                    message: result?.message,
                    data: {},
                };
            }
        },
        create: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    email, name, phone_num, birth,
                } = data;
                let query = {
                    mem_nm: name,
                    mem_email: email,
                    sms_recv_cp: phone_num,
                    birth_ymd: birth,
                    ci: phone_num + birth,
                    user_tp: 'PERSON',
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/user', query, makeHeaderData(dns_data, pay_type, decode_user));
                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: '',
                    data: {
                        guid: result?.data?.user_guid,
                        uniq_no: result?.data?.req_uniq_no,
                    },
                };
            } catch (err) {
                console.log(err)
                console.log(err?.response?.data)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        },
        account: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    settle_bank_code, settle_acct_num, settle_acct_name, guid,
                    birth
                } = data;
                let query = {
                    guid: guid,
                    bank_id: settle_bank_code,
                    acnt_no: settle_acct_num,
                    acnt_holder: settle_acct_name,
                    real_auth_no: birth,
                }
                console.log(query)
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/user/account', query, makeHeaderData(dns_data, pay_type, decode_user));
                console.log(result);

                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: '',
                    data: {
                        tid: result?.data?.tid,
                        uniq_no: result?.data?.req_uniq_no,
                    },
                };
            } catch (err) {
                console.log(err)
                console.log(err?.response?.data)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        },
        account_verify: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    tid, vrf_bank_code,
                } = data;
                let query = {
                    tid: tid,
                    vrf_word: vrf_bank_code,
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/user/account/verify', query, makeHeaderData(dns_data, pay_type, decode_user));
                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: '',
                    data: {
                        tid: result?.data?.tid,
                        uniq_no: result?.data?.req_uniq_no,
                    },
                };
            } catch (err) {
                console.log(err)
                console.log(err?.response?.data)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        }
    },
    bank: {
        list: async (data) => {
            try {
                let { dns_data, pay_type, decode_user, guid } = data;
                let query = {
                    guid: guid
                }
                query = new URLSearchParams(query).toString();
                let { data: result } = await axios.get(`https://${API_URL}/api/bank/list`, {
                    headers: makeHeaderData(dns_data, pay_type, decode_user)
                })
                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                for (var i = 0; i < result.data.length; i++) {
                    result.data[i].label = result.data[i]?.bank_nm;
                    result.data[i].value = result.data[i]?.bank_id;
                }
                return {
                    code: 100,
                    message: result?.message,
                    data: result.data,
                };
            } catch (err) {
                console.log(err);
                return {
                    code: -100,
                    message: result?.message,
                    data: {},
                };
            }
        },
    },
    vaccount: async (data) => {
        try {
            let {
                dns_data, pay_type, decode_user,
                guid, virtual_bank_code
            } = data;
            let query = {
                guid,
                bank_id: virtual_bank_code
            }
            query = makeBody(query, dns_data, pay_type)
            let result = await postRequest('/api/vaccount', query, makeHeaderData(dns_data, pay_type, decode_user));
            if (result?.code != '0000') {
                return {
                    code: -100,
                    message: result?.message,
                    data: {},
                };
            }
            return {
                code: 100,
                message: '',
                data: {
                    virtual_acct_num: result?.data?.vacnt_no,
                    tid: result?.data?.tid,
                },
            };
        } catch (err) {
            console.log(err)
            console.log(err?.response?.data)
            return {
                code: -100,
                message: '',
                data: {},
            };

        }
    },
    push: {
        create: async (data) => {//푸시 url등록
            try {
                let {
                    dns_data, pay_type, decode_user,
                    push_kind, push_tp, push_url, encr_yn
                } = data;
                let query = {
                    push_kind,
                    push_tp,
                    push_url,
                    encr_yn,
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/merchant/push', query, makeHeaderData(dns_data, pay_type, decode_user));
                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: '',
                    data: {},
                };
            } catch (err) {
                console.log(err)
                console.log(err?.response?.data)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        },
        update: async (data) => {//푸시 url등록
            try {
                let {
                    dns_data, pay_type, decode_user,
                    push_kind, push_tp, push_url, encr_yn
                } = data;
                let query = {
                    push_kind,
                    push_tp,
                    push_url,
                    encr_yn,
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/merchant/push', query, makeHeaderData(dns_data, pay_type, decode_user), 'PUT');
                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: '',
                    data: {},
                };
            } catch (err) {
                console.log(err)
                console.log(err?.response?.data)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        },
    }
}
