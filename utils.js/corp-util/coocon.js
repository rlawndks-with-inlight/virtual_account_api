import axios from 'axios';
import 'dotenv/config';
import crypto from 'crypto';
import https from 'https';

const API_URL = process.env.NODE_ENV == 'production' ? "https://apigw.coocon.co.kr" : "https://dev2.coocon.co.kr:8443";

const getDefaultBody = (dns_data, pay_type) => {
    return {
        "SECR_KEY": dns_data[`${pay_type}_sign_key`],
        "TRT_INST_CD": '08945816',
        "BANK_CD": '089',
        "TRSC_SEQ_NO": (new Date().getTime()).toString().substring(0, 12)
    }
}
export const cooconApi = {
    balance: {
        info: async (data) => {//잔액
            try {
                let {
                    dns_data, pay_type, decode_user,
                    guid, amount,
                } = data;
                let query = {
                    KEY: '6140',
                }
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, {
                    ...getDefaultBody(dns_data, pay_type),
                    ...query,
                })
                console.log(response)
                response.data = {
                    BAL_AMT: 10000000,
                    WDRW_CAN_AMT: 10000000,
                }
                return {
                    code: 100,
                    message: '',
                    data: {
                        amount: response.data?.WDRW_CAN_AMT,
                    },
                };
            } catch (err) {
                console.log(err?.response?.data)
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
                    { value: '002', label: '산업은행', },
                    { value: '003', label: '기업은행', },
                    { value: '004', label: 'KB국민은행', },
                    { value: '007', label: '수협은행', },
                    { value: '011', label: 'NH농협은행', },
                    { value: '012', label: '농ㆍ축협', },
                    { value: '020', label: '우리은행', },
                    { value: '023', label: 'SC제일은행', },
                    { value: '027', label: '한국씨티은행', },
                    { value: '031', label: '대구은행', },
                    { value: '032', label: '부산은행', },
                    { value: '034', label: '광주은행', },
                    { value: '035', label: '제주은행', },
                    { value: '037', label: '전북은행', },
                    { value: '039', label: '경남은행', },
                    { value: '045', label: '새마을금고', },
                    { value: '048', label: '신협', },
                    { value: '050', label: '저축은행', },
                    { value: '052', label: '모건스탠리은행', },
                    { value: '054', label: 'HSBC은행', },
                    { value: '055', label: '도이치은행', },
                    { value: '071', label: '우체국', },
                    { value: '081', label: '하나은행', },
                    { value: '088', label: '신한은행', },
                    { value: '089', label: '케이뱅크', },
                    { value: '090', label: '카카오뱅크', },
                    { value: '092', label: '토스혁신준비법인', },
                    { value: '209', label: '유안타증권', },
                    { value: '218', label: 'KB증권', },
                    { value: '238', label: '미래에셋대우', },
                    { value: '240', label: '삼성증권', },
                    { value: '243', label: '한국투자증권', },
                    { value: '247', label: 'NH투자증권', },
                    { value: '261', label: '교보증권', },
                    { value: '262', label: '하이투자증권', },
                    { value: '263', label: '현대차증권', },
                    { value: '264', label: '키움증권', },
                    { value: '265', label: '이베스트투자증권', },
                    { value: '266', label: 'SK증권', },
                    { value: '267', label: '대신증권', },
                    { value: '269', label: '한화투자증권', },
                    { value: '270', label: '하나금융증권', },
                    { value: '057', label: '제이피모간체이스은행', },
                    { value: '058', label: '미즈호은행', },
                    { value: '059', label: '엠유에프지은행', },
                    { value: '060', label: 'BOA은행', },
                    { value: '061', label: '비엔피파리바은행', },
                    { value: '062', label: '중국공상은행', },
                    { value: '063', label: '중국은행', },
                    { value: '064', label: '산림조합중앙회', },
                    { value: '065', label: '대화은행', },
                    { value: '066', label: '교통은행', },
                    { value: '067', label: '중국건설은행', },
                    { value: '278', label: '신한금융투자', },
                    { value: '279', label: 'DB금융투자', },
                    { value: '280', label: '유진투자증권', },
                    { value: '287', label: '메리츠증권', },
                    { value: '288', label: '카카오페이증권', },
                    { value: '290', label: '부국증권', },
                    { value: '291', label: '신영증권', },
                    { value: '292', label: '케이프투자증권', },
                    { value: '293', label: '한국증권금융', },
                    { value: '294', label: '한국포스증권', }
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
    account: {
        info: async (data) => {//예금주명조회
            try {
                let {
                    dns_data, pay_type, decode_user,
                    bank_code, acct_num
                } = data;
                let query = {
                    KEY: '6110',
                    RCV_BNK_CD: bank_code,
                    RCV_ACCT_NO: acct_num,
                }
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, {
                    ...getDefaultBody(dns_data, pay_type),
                    ...query,
                })
                response.data = {
                    RESP_CD: '0000',
                }
                return {
                    code: 100,
                    message: '',
                    data: {
                        result: response.data?.RESP_CD
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
    withdraw: {
        request: async (data) => {//출금요청
            try {
                let {
                    dns_data, pay_type, decode_user,
                    bank_code, acct_num
                } = data;
                let query = {
                    KEY: '6120',
                    RCV_BNK_CD: bank_code,
                    RCV_ACCT_NO: acct_num,
                }
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, {
                    ...getDefaultBody(dns_data, pay_type),
                    ...query,
                })
                response.data = {

                }
                return {
                    code: 100,
                    message: '',
                    data: response.data,
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
        request_check: async (data) => {//출금요청
            try {
                let {
                    dns_data, pay_type, decode_user,
                    bank_code, acct_num
                } = data;
                let query = {
                    KEY: '6170',
                    RCV_BNK_CD: bank_code,
                    RCV_ACCT_NO: acct_num,
                }
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, {
                    ...getDefaultBody(dns_data, pay_type),
                    ...query,
                })
                response.data = {

                }
                return {
                    code: 100,
                    message: '',
                    data: response.data,
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