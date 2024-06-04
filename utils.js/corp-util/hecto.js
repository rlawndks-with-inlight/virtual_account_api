
import axios from 'axios';
import 'dotenv/config';
import crypto from 'crypto';
import https from 'https';
import { returnMoment } from '../function.js';

//const API_URL = process.env.API_ENV == 'production' ? "https://npay.settlebank.co.kr" : "https://tbnpay.settlebank.co.kr";
const API_URL = "https://tbnpay.settlebank.co.kr";
const GW_API_URL = process.env.API_ENV == 'production' ? "https://gw.settlebank.co.kr" : "https://tbgw.settlebank.co.kr"

const getDefaultHeader = () => {
    return {
        'Content-Type': 'application/json;charset=utf-8',
    }
}
const getDefaultBody = (dns_data, pay_type) => {
    let return_moment = returnMoment();
    let date = return_moment.split(' ')[0].replaceAll('-', '');
    let time = return_moment.split(' ')[1].replaceAll(':', '');
    return {
        'mchtId': dns_data?.auth_mcht_id,
        'reqDt': date,
        'reqTm': time,
    }
}
const getAES256 = (data, key) => {
    const cipher = crypto.createCipheriv('aes-256-ecb', key, null);

    // 데이터 업데이트 및 암호화
    let encryptedData = cipher.update(data, 'utf8', 'base64');
    encryptedData += cipher.final('base64');

    return encryptedData;
}
const decryptAES256 = (encryptedData, key) => {
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);

    // 암호화된 데이터 복호화
    let decryptedData = decipher.update(encryptedData, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');

    return decryptedData;
}
const processObj = (obj_ = {}, hash_list = [], encr_list = [], dns_data) => {
    let obj = obj_;
    let pktHash = "";
    for (var i = 0; i < hash_list.length; i++) {
        pktHash += `${obj[hash_list[i]]}`;
    }
    pktHash += dns_data?.auth_api_id;
    const hash = crypto.createHash('sha256');
    hash.update(pktHash);
    const hashedData = hash.digest('hex');
    obj['pktHash'] = hashedData;

    for (var i = 0; i < encr_list.length; i++) {
        obj[encr_list[i]] = getAES256(`${obj[encr_list[i]]}`, dns_data?.auth_iv);
    }
    return obj;
}
function processWithdrawObj(obj_ = {}, dns_data = {}, aes_list = []) {
    let obj = obj_;
    let keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        if (aes_list.includes(keys[i])) {
            let key = '00000000000000000000000000000000';
            obj[keys[i]] = getAES256(obj[keys[i]], key);
        }

    }
    return obj;
}
export const hectoApi = {
    balance: {
        info: async (data) => {//잔액
            try {
                let {
                    dns_data, pay_type, decode_user,
                    guid, amount,
                } = data;

                let query = {
                    mchtId: dns_data?.withdraw_mid,
                }
                query = processWithdrawObj(query);
                let { data: response } = await axios.post(`${GW_API_URL}/pyag/v1/fxBalance`, query,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000 // 30초 타임아웃
                    });
                console.log(response)
                if (response?.outStatCd == '0021') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            amount: response?.blcKrw,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {},
                    };
                }

            } catch (err) {
                console.log(err)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        },
    },
    account: {
        info: async (data) => {//
            try {
                let {
                    dns_data, pay_type, decode_user,
                    bank_code,
                    acct_num,
                    name
                } = data;

                let query = {
                    hdInfo: 'SPAY_NA00_1.0',
                    ...getDefaultBody(dns_data, pay_type),
                    mchtId: process.env.API_ENV == 'production' ? 'M2353522' : 'M2358093',
                    mchtCustId: `${dns_data?.id}${new Date().getTime()}`,
                    bankCd: bank_code,
                    custAcntNo: acct_num,
                }
                let auth_iv = '0o83b22401AVZC1HM0Mi3TNV1ER4YIed';
                let auth_api_id = 'ST2305101028319313874';
                query = processObj(
                    query,
                    [
                        'mchtId',
                        'mchtCustId',
                        'reqDt',
                        'reqTm',
                        'custAcntNo',
                    ],
                    [
                        'mchtCustId',
                        'custAcntNo',
                    ],
                    {
                        ...dns_data,
                        auth_iv,
                        auth_api_id,
                    }
                )
                let { data: response } = await axios.post(`${API_URL}/v1/api/auth/acnt/ownercheck1`, query, {
                    headers: getDefaultHeader(),
                });
                if (response?.outStatCd == '0021') {
                    let mcht_cust_nm = process.env.API_ENV == 'production' ? decryptAES256(response?.mchtCustNm, auth_iv) : decryptAES256(response?.mchtCustNm, 'SETTLEBANKISGOODSETTLEBANKISGOOD');
                    return {
                        code: 100,
                        message: '',
                        data: {
                            name: mcht_cust_nm
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {},
                    };
                }

            } catch (err) {
                console.log(err)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        },
    },
    user: {
        account: async (data) => {//
            try {
                let {
                    dns_data, pay_type, decode_user,
                    bank_code,
                    acct_num,
                    name,
                } = data;

                let mcht_trd_no = `OID${dns_data?.id}${new Date().getTime()}`;
                let mcht_cust_id = `${dns_data?.id}${new Date().getTime()}`;
                let query = {
                    hdInfo: 'SPAY_AA00_1.0',
                    ...getDefaultBody(dns_data, pay_type),
                    mchtTrdNo: mcht_trd_no,
                    mchtCustId: mcht_cust_id,
                    bankCd: bank_code,
                    custAcntNo: acct_num,
                    mchtCustNm: name,
                    authType: '3',
                }
                console.log(query)
                query = processObj(
                    query,
                    [
                        'mchtId',
                        'reqDt',
                        'reqTm',
                        'bankCd',
                        'custAcntNo',
                    ],
                    [
                        'mchtCustId',
                        'custAcntNo',
                        'mchtCustNm',
                    ],
                    dns_data
                )
                let { data: response } = await axios.post(`${API_URL}/v1/api/auth/ownership/req`, query, {
                    headers: getDefaultHeader(),
                });
                mcht_cust_id = process.env.API_ENV == 'production' ? decryptAES256(response?.mchtCustId, dns_data?.auth_iv) : decryptAES256(response?.mchtCustId, 'SETTLEBANKISGOODSETTLEBANKISGOOD');
                if (response?.outStatCd == '0021') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            mcht_trd_no: response?.mchtTrdNo,
                            mcht_cust_id,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {
                            mcht_trd_no: response?.mchtTrdNo,
                            mcht_cust_id,
                        },
                    };
                }

            } catch (err) {
                console.log(err)
                return {
                    code: -100,
                    message: '',
                    data: {},
                };

            }
        },
        account_verify: async (data) => {//
            try {
                let {
                    dns_data, pay_type, decode_user,
                    mcht_trd_no,
                    mcht_cust_id,
                    vrf_word,
                } = data;

                let query = {
                    hdInfo: 'SPAY_RC10_1.0',
                    ...getDefaultBody(dns_data, pay_type),
                    'mchtCustId': mcht_cust_id,
                    mchtTrdNo: mcht_trd_no,
                    authNo: vrf_word,
                }
                query = processObj(
                    query,
                    [
                        'mchtId',
                        'reqDt',
                        'reqTm',
                        'mchtTrdNo',
                    ],
                    [
                        'mchtCustId',
                        'authNo',
                    ],
                    dns_data
                )
                let { data: response } = await axios.post(`${API_URL}/v1/api/auth/ownership/check`, query, {
                    headers: getDefaultHeader(),
                });
                if (response?.outStatCd == '0021') {
                    return {
                        code: 100,
                        message: '',
                        data: {

                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {},
                    };
                }
            } catch (err) {
                console.log(err)
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
                const bank_list = [
                    { value: '001', label: '한국은행' },
                    { value: '002', label: '산업은행' },
                    { value: '003', label: '기업은행' },
                    { value: '004', label: '국민은행' },
                    { value: '007', label: '수협은행' },
                    { value: '008', label: '수출입은행' },
                    { value: '011', label: 'NH농협은행' },
                    { value: '012', label: '농축협' },
                    { value: '020', label: '우리은행' },
                    { value: '023', label: 'SC제일은행' },
                    { value: '027', label: '한국씨티은행' },
                    { value: '031', label: '대구은행' },
                    { value: '032', label: '부산은행' },
                    { value: '034', label: '광주은행' },
                    { value: '035', label: '제주은행' },
                    { value: '037', label: '전북은행' },
                    { value: '039', label: '경남은행' },
                    { value: '041', label: '우리카드' },
                    { value: '045', label: '새마을금고' },
                    { value: '048', label: '신협' },
                    { value: '050', label: '저축은행' },
                    { value: '052', label: '모간스탠리은행' },
                    { value: '054', label: 'HSBC은행' },
                    { value: '055', label: '도이치은행' },
                    { value: '057', label: '제이피모간체이스은행' },
                    { value: '058', label: '미즈호은행' },
                    { value: '059', label: '엠유에프지은행' },
                    { value: '060', label: 'BOA은행' },
                    { value: '061', label: '비엔피파리바은행' },
                    { value: '062', label: '중국공상은행' },
                    { value: '063', label: '중국은행' },
                    { value: '064', label: '산림조합중앙회' },
                    { value: '065', label: '대화은행' },
                    { value: '066', label: '교통은행' },
                    { value: '067', label: '중국건설은행' },
                    { value: '071', label: '우체국' },
                    { value: '076', label: '신용보증기금' },
                    { value: '077', label: '기술보증기금' },
                    { value: '081', label: '하나은행' },
                    { value: '088', label: '신한은행' },
                    { value: '089', label: '케이뱅크' },
                    { value: '090', label: '카카오뱅크' },
                    { value: '092', label: '토스뱅크' },
                    { value: '094', label: '서울보증보험' },
                    { value: '101', label: '한국신용정보원' },
                    { value: '209', label: '유안타증권' },
                    { value: '218', label: 'KB증권' },
                    { value: '221', label: '상상인증권' },
                    { value: '222', label: '한양증권' },
                    { value: '223', label: '리딩투자증권' },
                    { value: '224', label: 'BNK투자증권' },
                    { value: '225', label: 'IBK투자증권' },
                    { value: '227', label: '다올투자증권' },
                    { value: '238', label: '미래에셋증권' },
                    { value: '240', label: '삼성증권' },
                    { value: '243', label: '한국투자증권' },
                    { value: '247', label: 'NH투자증권' },
                    { value: '261', label: '교보증권' },
                    { value: '262', label: '하이투자증권' },
                    { value: '263', label: '현대차증권' },
                    { value: '264', label: '키움증권' },
                    { value: '265', label: '이베스트투자증권' },
                    { value: '266', label: 'SK증권' },
                    { value: '267', label: '대신증권' },
                    { value: '269', label: '한화투자증권' },
                    { value: '270', label: '하나증권' },
                    { value: '271', label: '토스증권' },
                    { value: '272', label: 'NH선물' },
                    { value: '273', label: '코리아에셋투자증권' },
                    { value: '274', label: 'DS투자증권' },
                    { value: '275', label: '흥국증권' },
                    { value: '276', label: '유화증권' },
                    { value: '278', label: '신한투자증권' },
                    { value: '279', label: 'DB금융투자' }
                ]
                let result = {
                    code: 100,
                    message: 'success',
                    data: bank_list
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
    mobile: {
        request: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    phone_num,
                    name,
                    gender,
                    birth,
                    tel_com,
                } = data;
                let query = {
                    hdInfo: 'SPAY_M100_1.0',
                    ...getDefaultBody(dns_data, pay_type),
                    mchtCustId: `${dns_data?.id}${new Date().getTime()}`,
                    uii: birth + (gender == 'M' ? '1' : '2'),
                    telecomCd: parseInt(tel_com),
                    cphoneNo: phone_num,
                    mchtCustNm: name,
                    authMthdCd: 1,
                    pktHash: '',
                }
                query = processObj(
                    query,
                    [
                        'mchtId',
                        'mchtCustId',
                        'reqDt',
                        'reqTm',
                        'uii',
                        'cphoneNo',
                        'authMthdCd',
                    ],
                    [
                        'mchtCustId',
                        'uii',
                        'cphoneNo',
                        'mchtCustNm'
                    ],
                    dns_data
                )
                delete query['birth'];
                console.log(query)
                let { data: response } = await axios.post(`${API_URL}/v1/api/auth/mobile/req`, query, {
                    headers: getDefaultHeader(),
                });
                console.log(response)

                if (response?.outStatCd == '0021') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            tid: response?.tid,
                            trd_no: response?.trdNo,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {},
                    };
                }

            } catch (err) {
                console.log(err?.response)
                return {
                    code: -200,
                    message: '',
                    data: {},
                };

            }
        },
        check: async (data) => {
            try {
                let {
                    dns_data, pay_type, decode_user,
                    tid,
                    trd_no,
                    vrf_word
                } = data;

                let query = {
                    hdInfo: 'SPAY_M200_1.0',
                    ...getDefaultBody(dns_data, pay_type),
                    tid: tid,
                    trdNo: trd_no,
                    authNo: vrf_word,
                }
                query = processObj(
                    query,
                    [
                        'mchtId',
                        'reqDt',
                        'reqTm',
                        'tid',
                    ],
                    [],
                    dns_data
                )
                let { data: response } = await axios.post(`${API_URL}/v1/api/auth/mobile/check`, query, {
                    headers: getDefaultHeader(),
                });
                if (response?.outStatCd == '0021') {
                    return {
                        code: 100,
                        message: '',
                        data: {

                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {},
                    };
                }

            } catch (err) {
                console.log(err)
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
            let mcht_trd_no = `OID${dns_data?.id}${new Date().getTime()}`;
            try {
                let {
                    dns_data, pay_type, decode_user,
                    bank_code, acct_num, amount, acct_name, trx_id
                } = data;
                let return_moment = returnMoment();

                let query = {
                    mchtId: dns_data?.withdraw_mid,
                    mchtTrdNo: mcht_trd_no,
                    encCd: '23',
                    trdDt: return_moment.split(' ')[0].replaceAll('-', ''),
                    trdTm: return_moment.split(' ')[1].replaceAll(':', ''),
                    bankCd: bank_code,
                    custAcntNo: acct_num,
                    custAcntSumry: acct_name,
                    amt: amount,
                }
                query = processWithdrawObj(query, dns_data,
                    [
                        'encCd',
                        'custAcntNo',
                        'amt',
                    ]);
                query['custAcntNo'] = encodeURI(query['custAcntNo']);
                query['amt'] = encodeURI(query['amt']);
                let { data: response } = await axios.post(`${GW_API_URL}/pyag/v1/fxTransKrw`, query,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000 // 30초 타임아웃
                    });
                console.log(response)
                if (response?.outStatCd == '0021') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            amount: response?.TRSC_AMT,
                            tid: response?.trdNo,
                            virtual_acct_balance: response?.balance,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {
                            tid: mcht_trd_no,
                        },
                    };
                }
            } catch (err) {
                console.log(err)
                console.log(err?.response?.data)
                return {
                    code: -100,
                    message: '',
                    data: {
                        tid: mcht_trd_no,
                    },
                };

            }
        },
        request_check: async (data) => {//출금요청
            let mcht_trd_no = `OID${dns_data?.id}${new Date().getTime()}`;
            try {
                let {
                    dns_data, pay_type, decode_user,
                    date, tid
                } = data;
                let query = {
                    mchtId: dns_data?.withdraw_mid,
                    mchtTrdNo: mcht_trd_no,
                    trdNo: tid,
                    orgTrdDt: date,
                }
                query = processWithdrawObj(query, dns_data,
                    [

                    ]);

                let { data: response } = await axios.post(`${GW_API_URL}/pyag/v1/fxResult`, query,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000 // 30초 타임아웃
                    });
                if (response?.outStatCd == '0021') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            amount: response?.TRSC_AMT,
                            status: response?.status,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.outRsltMsg,
                        data: {
                            status: response?.status,
                        },
                    };
                }
            } catch (err) {
                console.log(err)
                console.log(err?.response?.data)
                return {
                    code: -100,
                    message: '',
                    data: {
                    },
                };

            }
        },
    }
}