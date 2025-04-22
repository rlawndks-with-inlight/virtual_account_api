import axios from "axios";
import { returnMoment } from "../function.js";
import crypto from 'crypto';

const API_URL = process.env.API_ENV == 'production' ? "https://www.i-connect.co.kr" : "https://testwww.i-connect.co.kr";

const getDefaultHeader = (dns_data, pay_type, timestamp) => {
    let mid = dns_data[`${pay_type}_api_id`];
    let secretkey = dns_data[`${pay_type}_sign_key`];

    const TEXT_A = `${mid}${secretkey}${timestamp}`;
    const SALT = secretkey;
    const TEXT_B = `${TEXT_A}${SALT}`;
    const hash = crypto.createHash('sha256');
    hash.update(TEXT_B, 'utf8');
    const TEXT_C = hash.digest('hex');

    // TEXT_B 생성
    return {
        'mid': mid,
        'sign': TEXT_C
    }
}
export const icbApi = {
    balance: {
        info: async (data) => {
            try {
                let {
                    dns_data,
                    pay_type,
                    ci,

                } = data;
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

                let query = {
                    timestamp,
                    memKey: ci,
                }
                let { data: response } = await axios.post(`${API_URL}/v3/merchant/balance/getInfo`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });
                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {
                        amount: response.data?.balAmt,
                        hold_deposit_amount: response.data?.depositAmt,
                    },
                };

            } catch (err) {
                console.log(err)
                return {
                    code: -200,
                    message: '',
                    data: {},
                };

            }
        },
    },
    vaccount: async (data) => {
        try {
            let {
                dns_data,
                pay_type,
                ci,
            } = data;
            let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

            let query = {
                timestamp,
                memKey: ci,
            }
            let uri = `/v3/member/publish/virtAcnt`;
            if (dns_data?.deposit_process_type == 1) {
                uri = `/v2/merchant/member/publish/virtAcnt`;
            }
            let { data: response } = await axios.post(`${API_URL}${uri}`, query, {
                headers: getDefaultHeader(dns_data, pay_type, timestamp)
            });
            if (response?.code != 200) {
                return {
                    code: -100,
                    message: response?.message,
                    data: {},
                };
            }
            return {
                code: 100,
                message: response?.message,
                data: {
                    virtual_bank_code: response?.data?.bankCd,
                    virtual_acct_num: response?.data?.virtAcntNo,
                },
            };

        } catch (err) {
            console.log(err)
            return {
                code: -200,
                message: '',
                data: {},
            };

        }
    },
    bank: {
        list: async (data) => {
            try {
                const bank_list = [
                    { label: '산업', value: '002', },
                    { label: '기업', value: '003', },
                    { label: '국민', value: '004', },
                    { label: '수협', value: '007', },
                    { label: '농협', value: '011', },
                    { label: '지역농축협', value: '012', },
                    { label: '우리', value: '020', },
                    { label: 'SC 제일', value: '023', },
                    { label: '씨티*', value: '027', },
                    { label: '대구', value: '031', },
                    { label: '부산', value: '032', },
                    { label: '광주', value: '034', },
                    { label: '제주', value: '035', },
                    { label: '전북', value: '037', },
                    { label: '경남', value: '039', },
                    { label: '우리카드', value: '041', },
                    { label: '새마을금고중앙회', value: '045', },
                    { label: '신협', value: '048', },
                    { label: '상호저축은행', value: '050', },
                    { label: 'HSBC은행', value: '054', },
                    { label: '도이치', value: '055', },
                    { label: 'JP모간체이스은행', value: '057', },
                    { label: 'BOA은행', value: '060', },
                    { label: 'BNP파리바은행', value: '061', },
                    { label: '중국공상은행', value: '062', },
                    { label: '산림조합중앙회', value: '064', },
                    { label: '우체국', value: '071', },
                    { label: 'KEB 하나', value: '081', },
                    { label: '신한', value: '088', },
                    { label: '케이뱅크', value: '089', },
                    { label: '카카오뱅크', value: '090', },
                    { label: '토스', value: '092', },
                    { label: '유안타증권', value: '209', },
                    { label: 'KB증권', value: '218', },
                    { label: 'IBK투자증권', value: '225', },
                    { label: 'KTB투자증권', value: '227', },
                    { label: '미래에셋대우', value: '238', },
                    { label: '삼성증권', value: '240', },
                    { label: '한국투자증권', value: '243', },
                    { label: 'NH투자증권', value: '247', },
                    { label: '교보증권', value: '261', },
                    { label: '하이투자증권', value: '262', },
                    { label: 'HMC투자증권', value: '263', },
                    { label: '키움증권', value: '264', },
                    { label: '이베스트투자증권', value: '265', },
                    { label: 'SK증권', value: '266', },
                    { label: '대신증권', value: '267', },
                    { label: '한화투자증권', value: '269', },
                    { label: '하나금융투자', value: '270', },
                    { label: '토스증권', value: '271', },
                    { label: '신한금융투자', value: '278', },
                    { label: 'DB금융투자', value: '279', },
                    { label: '유진투자증권', value: '280', },
                    { label: '메리츠증권', value: '287', },
                    { label: '부국증권', value: '290', },
                    { label: '신영증권', value: '291', },
                    { label: '포스증권', value: '294', },
                    { label: 'BC', value: '361', },
                    { label: '삼성카드', value: '365', },
                    { label: '신한카드', value: '366', },
                    { label: '현대카드', value: '367', },
                    { label: '롯데카드', value: '368', },
                    { label: '하나카드', value: '374', },
                    { label: 'KB국민카드', value: '381' },
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
    user: {
        account: async (data) => {
            try {
                let {
                    dns_data,
                    pay_type,
                    ci,
                    bank_code,
                    acct_num,
                    name,
                    business_num,
                    user_type,
                } = data;
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

                let query = {
                    timestamp,
                    memKey: ci,
                    bankCd: bank_code,
                    depoAcntNo: acct_num,
                    depoNm: name,
                }
                if (user_type != 0) {
                    query['bizNo'] = business_num;
                }
                let uri = `/v3/member/deposit/acntCert/request`;
                if (dns_data?.deposit_process_type == 1) {
                    uri = `/v2/merchant/member/acntCert/request`;
                }
                let { data: response } = await axios.post(`${API_URL}${uri}`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });

                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {
                        tid: response?.data?.acntCertTrxNo || `${new Date()}${bank_code}${acct_num}`,
                    },
                };

            } catch (err) {
                console.log(err)
                return {
                    code: -200,
                    message: '',
                    data: {},
                };

            }
        },
        account_verify: async (data) => {
            try {
                let {
                    dns_data,
                    pay_type,
                    ci,
                    bank_code,
                    acct_num,
                    tid,
                    vrf_word,
                } = data;
                let return_moment = returnMoment();
                let date = return_moment.split(' ')[0].replaceAll('-', '');
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

                let query = {
                    timestamp,
                    memKey: ci,
                    bankCd: bank_code,
                    depoAcntNo: acct_num,
                    acntCertCd: vrf_word,
                    acntCertTrxDt: date,
                    acntCertTrxNo: tid,
                }
                let uri = `/v3/member/deposit/acntCert/confirm`;
                if (dns_data?.deposit_process_type == 1) {
                    uri = `/v2/merchant/member/acntCert/confirm`;
                }
                let { data: response } = await axios.post(`${API_URL}${uri}`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });
                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {
                        tid: tid,
                    },
                };

            } catch (err) {
                console.log(err)
                return {
                    code: -200,
                    message: '',
                    data: {},
                };

            }
        },
    },
    account: {
        info: async (data) => {
            try {
                let {
                    dns_data,
                    pay_type,
                    ci,
                    bank_code,
                    acct_num,
                    name,
                    business_num,
                    user_type,
                } = data;
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')
                let query = {
                    timestamp,
                    memKey: ci,
                    bankCd: bank_code,
                    depoAcntNo: acct_num,
                    depoNm: name,
                }
                if (user_type != 0) {
                    query[`bizDiv`] = '02';
                    query[`bizNo`] = business_num;
                }
                let uri = `/v3/member/acntCert/realName/request`;
                if (dns_data?.deposit_process_type == 1) {
                    uri = `/v2/merchant/member/acntCert/request`;
                }
                let { data: response } = await axios.post(`${API_URL}${uri}`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });

                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {
                        tid: response?.data?.acntCertTrxNo || `${new Date()}${bank_code}${acct_num}`,
                    },
                };

            } catch (err) {
                console.log(err)
                return {
                    code: -200,
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
                    dns_data,
                    pay_type,
                    ci,
                    birth,
                    name,
                    gender,
                    ntv_frnr,
                    tel_com,
                    phone_num,
                    is_new_phone = 1,
                } = data;
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

                let query = {
                    timestamp,
                    memKey: ci,
                    name: name,
                    birthday: birth,
                    gender: gender,
                    localTp: ntv_frnr,
                    telComCd: tel_com,
                    telNo: phone_num,
                    recertYn: is_new_phone == 1 ? 'N' : 'Y',
                }
                console.log(getDefaultHeader(dns_data, pay_type, timestamp))
                let { data: response } = await axios.post(`${API_URL}/v3/member/hpCert/request`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });

                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {
                        tid: response?.data?.hpCertTrxNo,
                    },
                };

            } catch (err) {
                console.log(err)
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
                    dns_data,
                    pay_type,
                    ci,
                    phone_num,
                    vrf_word,
                    tid,
                    is_new_phone = 1
                } = data;
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

                let query = {
                    timestamp,
                    memKey: ci,
                    telNo: phone_num,
                    hpCertCd: vrf_word,
                    hpCertTrxNo: tid,
                    recertYn: is_new_phone == 1 ? 'N' : 'Y',
                }
                let { data: response } = await axios.post(`${API_URL}/v3/member/hpCert/confirm`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });
                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {},
                };

            } catch (err) {
                console.log(err)
                return {
                    code: -200,
                    message: '',
                    data: {},
                };

            }
        },
    },
    withdraw: {
        request: async (data) => {//출금신청
            try {
                let {
                    dns_data,
                    pay_type,
                    ci,
                    trx_id,
                    amount,
                } = data;
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

                let query = {
                    timestamp,
                    memKey: ci,
                    trxAmt: amount,
                    partnerTrxNo: trx_id,
                }
                let { data: response } = await axios.post(`${API_URL}/v3/member/settle/request/amt`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });
                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {
                        tid: response?.data?.partnerTrxNo,
                    },
                };

            } catch (err) {
                console.log(err)
                return {
                    code: -200,
                    message: '',
                    data: {},
                };

            }
        },
        request_check: async (data) => {//출금확인
            try {
                let {
                    dns_data,
                    pay_type,
                    ci,
                    tid,
                } = data;
                let timestamp = await returnMoment().replaceAll(' ', '').replaceAll('-', '').replaceAll(':', '')

                let query = {
                    timestamp,
                    memKey: ci,
                    partnerTrxNos: tid,
                }
                let { data: response } = await axios.post(`${API_URL}/v3/merchant/settle/inquiry`, query, {
                    headers: getDefaultHeader(dns_data, pay_type, timestamp)
                });
                let status = 10;
                let result = response?.data?.result[0];
                if (result?.trxStat == 'WT' || result?.trxStat == 'IP') {
                    status = 6;
                } else if (result?.trxStat == 'RF') {
                    status = 3;
                }
                if (response?.code != 200) {
                    return {
                        code: -100,
                        message: response?.message,
                        data: {
                            status,
                        },
                    };
                }
                return {
                    code: 100,
                    message: response?.message,
                    data: {
                        status,
                    },
                };

            } catch (err) {
                console.log(err)
                return {
                    code: -200,
                    message: '',
                    data: {

                    },
                };

            }
        },
    },
}