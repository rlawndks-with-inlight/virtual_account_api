import axios from "axios";
import { returnMoment } from "../function.js";

const API_URL = process.env.API_ENV == 'production' ? "https://www.i-connect.co.kr" : "https://testwww.i-connect.co.kr";

const getDefaultHeader = (dns_data, pay_type) => {
    return {
        'mid': dns_data[`${pay_type}_api_id`],
        'sign': dns_data[`${pay_type}_sign_key`],
    }
}
export const icbApi = {
    vaccount: async (data) => {
        try {
            let {
                dns_data,
                pay_type,
                ci,

            } = data;
            let query = {
                memKey: ci,
            }
            let { data: response } = await axios.post(`${API_URL}/v1/pg/publishVirtAcnt`, query, {
                headers: getDefaultHeader(dns_data, pay_type,)
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
                } = data;
                let query = {
                    memKey: ci,
                    bankCd: bank_code,
                    depoAcntNo: acct_num,
                    depoNm: name,
                }
                let { data: response } = await axios.post(`${API_URL}/v1/pg/acntCert/request`, query, {
                    headers: getDefaultHeader(dns_data, pay_type,)
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
                        tid: response?.data?.acntCertTrxNo,
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
                let query = {
                    memKey: ci,
                    bankCd: bank_code,
                    depoAcntNo: acct_num,
                    acntCertCd: vrf_word,
                    acntCertTrxDt: date,
                    acntCertTrxNo: tid,
                }
                let { data: response } = await axios.post(`${API_URL}/v1/pg/acntCert/confirm`, query, {
                    headers: getDefaultHeader(dns_data, pay_type,)
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
                } = data;
                let query = {
                    memKey: ci,
                    bankCd: bank_code,
                    depoAcntNo: acct_num,
                    depoNm: name,
                }
                let { data: response } = await axios.post(`${API_URL}/v1/pg/withdrawAcntCert`, query, {
                    headers: getDefaultHeader(dns_data, pay_type,)
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
                } = data;
                let query = {
                    memKey: ci,
                    name: name,
                    birthday: birth,
                    gender: gender,
                    localTp: ntv_frnr,
                    telComCd: tel_com,
                    telNo: phone_num,
                }
                let { data: response } = await axios.post(`${API_URL}/v1/pg/hpCert/request`, query, {
                    headers: getDefaultHeader(dns_data, pay_type,)
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
                } = data;
                let query = {
                    memKey: ci,
                    telNo: phone_num,
                    hpCertCd: vrf_word,
                    hpCertTrxNo: tid,
                }
                let { data: response } = await axios.post(`${API_URL}/v1/pg/hpCert/confirm`, query, {
                    headers: getDefaultHeader(dns_data, pay_type,)
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
}