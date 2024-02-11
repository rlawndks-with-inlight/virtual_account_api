import axios from 'axios';
import 'dotenv/config';
import crypto from 'crypto';
import https from 'https';

const API_URL = process.env.API_ENV == 'production' ? "https://apigw.coocon.co.kr" : "https://dev2.coocon.co.kr:8443";
const getDefaultBody = (dns_data, pay_type) => {
    return {
        "SECR_KEY": dns_data[`${pay_type}_sign_key`],
        "TRT_INST_CD": dns_data[`${pay_type}_trt_inst_code`],
        "BANK_CD": dns_data[`${pay_type}_virtual_bank_code`],
        "TRSC_SEQ_NO": (new Date().getTime()).toString().substring(1, 13)
    }
}

const getDefaultHeader = () => {
    return {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
}
const axiosIns = () => {
    let dns_info = {
        // You can add your headers here
        // ================================
        timeout: 10000,
        headers: {
            "Accept": undefined,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    }

    const axiosIns = axios.create(dns_info)

    return axiosIns;
}

export const cooconApi = {
    balance: {
        info: async (data) => {//잔액
            try {
                let {
                    dns_data, pay_type, decode_user,
                    guid, amount,
                } = data;

                let query = new URLSearchParams()
                query.append('JSONData', JSON.stringify({
                    ...getDefaultBody(dns_data, pay_type),
                    KEY: '6140',
                }))
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, query, {
                    headers: getDefaultHeader(),
                });
                if (response?.RESP_CD == '0000') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            amount: response?.WDRW_CAN_AMT,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.RESP_MSG,
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
                    bank_code, acct_num, amount
                } = data;

                let query = new URLSearchParams()
                query.append('JSONData', JSON.stringify({
                    ...getDefaultBody(dns_data, pay_type),
                    KEY: '6110',
                    RCV_BNK_CD: bank_code,
                    RCV_ACCT_NO: acct_num,
                    TRSC_AMT: amount,
                }))
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, query, {
                    headers: getDefaultHeader(),
                });
                if (response?.RESP_CD == '0000') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            withdraw_acct_name: response?.RCV_ACCT_NM
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.RESP_MSG,
                        data: {},
                    };
                }
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
            let {
                dns_data, pay_type, decode_user,
                bank_code, acct_num, amount, deposit_acct_name, trx_id
            } = data;
            let default_body = getDefaultBody(dns_data, pay_type);
            try {

                let query = new URLSearchParams()
                query.append('JSONData', JSON.stringify({
                    ...default_body,
                    "TRSC_SEQ_NO": trx_id,
                    KEY: '6120',
                    RCV_BNK_CD: bank_code,
                    RCV_ACCT_NO: acct_num,
                    WDRW_ACCT_NO: dns_data[`${pay_type}_virtual_acct_num`],
                    TRSC_AMT: amount,
                    WDRW_ACCT_NM: deposit_acct_name,
                }))
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, query, {
                    headers: getDefaultHeader(),
                });
                if (response?.RESP_CD == '0000') {
                    return {
                        code: 100,
                        message: '',
                        data: {
                            amount: response?.TRSC_AMT,
                            tid: default_body?.TRSC_SEQ_NO,
                            virtual_acct_balance: response?.BAL_AMT,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.RESP_MSG,
                        data: {
                            tid: default_body?.TRSC_SEQ_NO
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
                        tid: default_body?.TRSC_SEQ_NO
                    },
                };

            }
        },
        request_check: async (data) => {//출금확인
            try {
                let {
                    dns_data, pay_type, decode_user,
                    date, tid
                } = data;
                let query = new URLSearchParams()
                query.append('JSONData', JSON.stringify({
                    ...getDefaultBody(dns_data, pay_type),
                    KEY: '6170',
                    RQRE_TMSG_NO: tid,
                    REQ_TRSC_DT: date
                }))
                let { data: response } = await axios.post(`${API_URL}/sol/gateway/vapg_wapi.jsp`, query, {
                    headers: getDefaultHeader(),
                });
                let status = response?.STS;
                if (response?.RESP_CD == '0000') {
                    if (response?.TRSC_AMT > 0 && status == 1) {
                        return {
                            code: 100,
                            message: '',
                            data: {
                                amount: response?.TRSC_AMT,
                                status,
                            },
                        };
                    } else {
                        return {
                            code: -100,
                            message: response?.RCV_ACCT_NM,
                            data: {
                                amount: response?.TRSC_AMT,
                                status,
                            },
                        };
                    }
                } else {
                    return {
                        code: -100,
                        message: response?.RESP_MSG,
                        data: {},
                    };
                }
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