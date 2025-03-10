import axios from 'axios';
import 'dotenv/config';
import crypto from 'crypto';
import https from 'https';
import { makeObjKeysLowerCase } from '../function.js';

const API_URL = process.env.API_ENV == 'production' ? "api.bankners.com" : "stgapi.bankners.com";
const BEARER_API_URL = process.env.API_ENV == 'production' ? "https://on-api.epayday.co.kr" : "https://stgon-api.epayday.co.kr";

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
                    user_type,
                    business_num, company_name, ceo_name, company_phone_num, ci,
                } = data;
                if (!ci) {
                    ci = `${new Date().getTime()}` + phone_num + birth;
                }
                if (user_type == 0) {
                    user_type = 'PERSON';
                } else if (user_type == 1) {
                    user_type = 'CORP_BIZ';
                } else if (user_type == 2) {
                    user_type = 'PERSONAL_BIZ';
                }
                let query = {
                    mem_nm: name,
                    mem_email: email,
                    sms_recv_cp: phone_num,
                    birth_ymd: birth,
                    ci: ci,
                    user_tp: user_type,
                    auth_tp: 'PASS',
                }
                if (user_type == 'CORP_BIZ' || user_type == 'PERSONAL_BIZ') {
                    query = {
                        ...query,
                        biz_no: business_num,
                        biz_nm: company_name,
                        ceo_nm: ceo_name,
                        tel: company_phone_num,
                    }
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/user', query, makeHeaderData(dns_data, pay_type, decode_user));
                console.log(result)

                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {
                            ci,
                        },
                    };
                }
                return {
                    code: 100,
                    message: '',
                    data: {
                        guid: result?.data?.user_guid,
                        uniq_no: result?.data?.req_uniq_no,
                        ci: ci,
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
                    deposit_bank_code, deposit_acct_num, deposit_acct_name, guid,
                    birth, business_num, user_type,
                    tid,
                } = data;
                if (user_type == 0) {
                    user_type = 'PERSON';
                } else if (user_type == 1) {
                    user_type = 'CORP_BIZ';
                } else if (user_type == 2) {
                    user_type = 'PERSONAL_BIZ';
                }
                let query = {
                    guid: guid,
                    bank_id: deposit_bank_code,
                    acnt_no: deposit_acct_num,
                    real_auth_no: user_type == 'PERSON' ? birth : business_num,
                    acnt_holder: deposit_acct_name
                }
                let result = undefined;
                if (dns_data?.deposit_process_type == 1) {
                    console.log(tid)
                    result = await axios.post(`${BEARER_API_URL}/api/bank/v1/verify`, {
                        mid: dns_data?.deposit_api_id,
                        bankCd: deposit_bank_code,
                        depoNm: deposit_acct_name,
                        depoAcntNo: deposit_acct_num,
                        trxNo: tid,
                    });
                    if (result?.status == 200) {
                        result = result?.data ?? {};
                    }
                    result = makeObjKeysLowerCase(result);
                    console.log(result)
                } else {
                    query = makeBody(query, dns_data, pay_type)
                    result = await postRequest('/api/user/account', query, makeHeaderData(dns_data, pay_type, decode_user));
                }

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
                    tid, vrf_word,
                } = data;
                let query = {
                    tid: tid,
                    vrf_word: vrf_word,
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
        },
    },
    transfer: {
        pass: async (data) => {//이체
            try {
                let {
                    dns_data, pay_type, decode_user,
                    from_guid, to_guid,
                    amount,
                } = data;
                let query = {
                    from_guid: from_guid,
                    to_guid: to_guid,
                    trx_amt: amount,
                    trx_curr: 'KRW'
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/transfer/auth/pass', query, makeHeaderData(dns_data, pay_type, decode_user));
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
    },
    balance: {
        info: async (data) => {
            try {
                let { dns_data, pay_type, decode_user, guid, curr } = data;
                let query = {
                    guid: guid,
                    curr: 'KRW',
                }
                query = new URLSearchParams(query).toString();
                let { data: result } = await axios.get(`https://${API_URL}/api/balance/info?${query}`, {
                    headers: makeHeaderData(dns_data, pay_type, decode_user)
                })
                if (result?.code != '0000') {
                    return {
                        code: -100,
                        message: result?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: result?.message,
                    data: {
                        guid: result.data?.guid,
                        amount: result.data?.bal_tot_amt,
                    },
                };
            } catch (err) {
                console.log(err?.response?.data);
                return {
                    code: -100,
                    message: '',
                    data: {},
                };
            }
        },
    },
    bank: {
        list: async (data) => {
            try {
                let { dns_data, pay_type, decode_user, guid } = data;
                let query = {
                    guid: guid
                }
                query = new URLSearchParams(query).toString();
                // let { data: result } = await axios.get(`https://${API_URL}/api/bank/list`, {
                //     headers: makeHeaderData(dns_data, pay_type, decode_user)
                // })
                // if (result?.code != '0000') {
                //     return {
                //         code: -100,
                //         message: result?.message,
                //         data: {},
                //     };
                // }
                const bank_list = [
                    {
                        bank_id: '039',
                        bank_nm: '경남은행',
                        bank_en_nm: 'Kyongnam Bank',
                        swift_cd: 'KYNAKR22'
                    },
                    {
                        bank_id: '003',
                        bank_nm: 'IBK기업은행',
                        bank_en_nm: '',
                        swift_cd: 'IBKOKRSE'
                    },
                    {
                        bank_id: '088',
                        bank_nm: '신한은행',
                        bank_en_nm: 'SHINHAN BANK',
                        swift_cd: 'SHBKKRSE'
                    },
                    {
                        bank_id: '004',
                        bank_nm: 'KB국민은행',
                        bank_en_nm: '',
                        swift_cd: 'CZNBKRSE'
                    },
                    {
                        bank_id: '081',
                        bank_nm: 'KEB하나은행',
                        bank_en_nm: 'KEB Hana Bank',
                        swift_cd: 'KOEXKRSE'
                    },
                    {
                        bank_id: '090',
                        bank_nm: '카카오뱅크',
                        bank_en_nm: 'KAKAO BANK',
                        swift_cd: 'CITIKRSXKA'
                    },
                    {
                        bank_id: '089',
                        bank_nm: '케이뱅크',
                        bank_en_nm: 'K BANK',
                        swift_cd: ''
                    },
                    {
                        bank_id: '071',
                        bank_nm: '우체국',
                        bank_en_nm: '',
                        swift_cd: 'SHBKKRSEKP'
                    },
                    {
                        bank_id: '007',
                        bank_nm: 'Sh수협은행',
                        bank_en_nm: '',
                        swift_cd: 'NFFCKRSE'
                    },
                    {
                        bank_id: '020',
                        bank_nm: '우리은행',
                        bank_en_nm: '',
                        swift_cd: 'HVBKKRSE'
                    },
                ]
                let result = {
                    code: 100,
                    message: 'success',
                    data: bank_list
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
                    message: '',
                    data: {},
                };
            }
        },
    },
    vaccount: async (data) => {
        try {
            let {
                dns_data, pay_type, decode_user,
                guid
            } = data;
            let query = {
                guid,
                bank_id: dns_data[`${pay_type}_virtual_bank_code`],
                version: 2,
            }
            query = makeBody(query, dns_data, pay_type)
            let result = await postRequest('/api/vaccount', query, makeHeaderData(dns_data, pay_type, decode_user));
            console.log(result)
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
                    bank_id: dns_data[`${pay_type}_virtual_bank_code`],
                    virtual_acct_num: result?.data?.vacnt_no,
                    tid: result?.data?.tid,
                    virtual_acct_name: result?.data?.vacnt_nm,
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
    },
    mother: {
        to: async (data) => {//은행정보 출력
            try {
                let {
                    dns_data, pay_type, decode_user,
                    amount, guid
                } = data;
                let query = {
                    from_guid: guid,
                    to_guid: dns_data[`${pay_type}_guid`],
                    trx_amt: amount,
                    trx_curr: 'KRW',
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/pay/auth/pass', query, makeHeaderData(dns_data, pay_type, decode_user));
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
    },
    withdraw: {
        request: async (data) => {//출금요청
            try {
                let {
                    dns_data, pay_type, decode_user,
                    guid, amount,
                } = data;
                let query = {
                    guid: guid,
                    trx_amt: amount,
                    trx_curr: 'KRW'
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/user/withdraw/auth/pass', query, makeHeaderData(dns_data, pay_type, decode_user));
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
    },
    sms: {
        push: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    name,
                    tel_com,
                    phone_num,
                    birth,
                    acct_back_one_num,
                    type,
                } = data;
                let query = {
                    nm: name,
                    telec_tp: tel_com,
                    cp_no: phone_num,
                    idntt_no: birth.substring(2, 8) + acct_back_one_num,
                    auth_usage_cd: type,
                }
                let result = undefined;
                if (dns_data?.deposit_process_type == 1) {
                    result = await axios.post(`${BEARER_API_URL}/api/user/v1/phone/verify`, {
                        Mid: dns_data?.deposit_api_id,
                        name: name,
                        ssn7: birth + acct_back_one_num,
                        mobileCo: tel_com.replace('0', ''),
                        mobileNo: phone_num,
                    });
                    if (result?.status == 200) {
                        result = result?.data ?? {};
                    }
                    result = makeObjKeysLowerCase(result);
                    result.data = {
                        tid: result?.message,
                    }
                } else {
                    query = makeBody(query, dns_data, pay_type)
                    result = await postRequest('/api/cp/auth', query, makeHeaderData(dns_data, pay_type, decode_user));
                }
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
        check: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    tid, vrf_word,
                } = data;
                console.log(data)
                let query = {
                    tid: tid,
                    auth_no: vrf_word,
                }
                let result = undefined;
                if (dns_data?.deposit_process_type == 1) {
                    result = await axios.post(`${BEARER_API_URL}/api/user/v1/phone/result`, {
                        Mid: dns_data?.deposit_api_id,
                        trxNo: tid,
                        authNo: vrf_word,
                    });
                    console.log(result)
                    if (result?.status == 200) {
                        result = result?.data ?? {};
                    }
                    result = makeObjKeysLowerCase(result);
                    console.log(result)
                } else {
                    query = makeBody(query, dns_data, pay_type)
                    result = await postRequest('/api/cp/verify', query, makeHeaderData(dns_data, pay_type, decode_user));
                }
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
                        ci: result?.data?.ci,
                        di: result?.data?.di,
                        tid: result?.data?.tid,
                        auth_date: result?.data?.auth_dt,
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
    },
    gift: {
        order: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    guid,
                    gift_biz,
                    gift_price,
                    gift_count,
                } = data;
                let query = {
                    guid: guid,
                    gift_biz: gift_biz,
                    gift_cd: gift_price,
                    gift_cnt: gift_count,
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/gift/order', query, makeHeaderData(dns_data, pay_type, decode_user));
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
        auth: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    guid,
                    gift_biz,
                    gift_num,
                } = data;
                let query = {
                    guid,
                    gift_biz,
                    gift_no: gift_num,
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/gift/auth', query, makeHeaderData(dns_data, pay_type, decode_user));
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
        use: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    guid,
                    gift_biz,
                    gift_num,
                    vrf_word,
                } = data;
                let query = {
                    guid,
                    gift_biz,
                    gift_no: gift_num,
                    auth_no: vrf_word,
                }
                query = makeBody(query, dns_data, pay_type)
                let result = await postRequest('/api/gift/use', query, makeHeaderData(dns_data, pay_type, decode_user));
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
                        curr: result?.data?.curr,
                        amount: result?.data?.trx_amt,
                        member_balance: result?.data?.bal_tot_amt,
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
    },
}
