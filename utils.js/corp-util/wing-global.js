import axios from "axios";

const API_URL = process.env.API_ENV == 'production' ? "https://na.winglobalpay.com" : "https://na.winglobalpay.com";

const getDefaultHeader = (dns_data, pay_type) => {
    let mid = dns_data[`${pay_type}_api_id`];
    // TEXT_B 생성
    return {
        'Authorization': mid,
        'Content-Type': 'application/json; charset=utf-8',
    }
}
export const wingGlobalApi = {
    balance: {
        info: async (data) => {
            try {
                let {
                    dns_data,
                    pay_type,
                } = data;

                let query = {
                    telegram_no: '999999',
                }
                let { data: response } = await axios.post(`${API_URL}/api/rt/v1/balance/check`, query, {
                    headers: getDefaultHeader(dns_data, pay_type)
                });
                if (response?.status == 200) {
                    return {
                        code: 100,
                        message: 'success',
                        data: {
                            amount: payable_amount,
                        },
                    };
                }
                return {
                    code: -100,
                    message: response?.status,
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
    vaccount: async (data) => {
        try {
            let {
                dns_data,
                pay_type,
                acct_num,
                acct_name,
                phone_num,
                birth,
                gender,
            } = data;

            let query = {
                mchtId: 'mchtId',
                bankCd: bank_code,
                account: acct_num,
                payerName: acct_name,
                payerTel: phone_num,
                dob: birth,
                gender: gender,
                recvBankCd: dns_data[`${pay_type}_virtual_bank_code`],
            }
            let { data: response } = await axios.post(`${API_URL}/api/v1/vactFcs`, query, {
                headers: getDefaultHeader(dns_data, pay_type)
            });
            if (response?.status == 200) {
                return {
                    code: 100,
                    message: 'success',
                    data: {
                        virtual_bank_code: response?.vact?.recvBankCd,
                        virtual_acct_num: response?.vact?.account,
                    },
                };
            }
            return {
                code: -100,
                message: response?.status,
                data: {

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
    vaccount_delete: async (data) => {
        try {
            let {
                dns_data,
                pay_type,
                virtual_acct_num,
            } = data;
            let query = {
                "accountList": [
                    virtual_acct_num
                ]
            }
            let { data: response } = await axios.post(`${API_URL}/api/v1/deleteVactInfo`, query, {
                headers: getDefaultHeader(dns_data, pay_type)
            });

            if (response?.statusCodeValue == 200) {
                return {
                    code: 100,
                    message: 'success',
                    data: {
                    },
                };
            }
            return {
                code: -100,
                message: response?.statusCode,
                data: {

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
                    { label: '산업은행', value: '002', },
                    { label: '기업은행', value: '003', },
                    { label: '국민은행', value: '004', },
                    { label: '수협중앙회', value: '007', },
                    { label: '농협', value: '011', },
                    { label: '우리은행', value: '020', },
                    { label: 'SC은행', value: '023', },
                    { label: '한국씨티은행', value: '027', },
                    { label: '대구은행', value: '031', },
                    { label: '부산은행', value: '032', },
                    { label: '광주은행', value: '034', },
                    { label: '제주은행', value: '035', },
                    { label: '전북은행', value: '037', },
                    { label: '경남은행', value: '039', },
                    { label: '새마을금고중앙회', value: '045', },
                    { label: '신협중앙회', value: '048', },
                    { label: 'BOA은행', value: '060', },
                    { label: '우체국', value: '071', },
                    { label: '하나은행', value: '081', },
                    { label: '신한은행', value: '088', },
                    { label: '케이뱅크', value: '089', },
                    { label: '카카오은행', value: '090', },
                    { label: 'SBI저축은행', value: '103', },
                    { label: '유안타증권', value: '209', },
                    { label: '미래대우증권', value: '238', },
                    { label: '삼성증권', value: '240', },
                    { label: 'NH투자증권', value: '247', },
                    { label: '키움증권', value: '264', },
                    { label: '대신증권', value: '267', },
                    { label: '한화투자증권', value: '269', },
                    { label: '신한금융투자', value: '278', },
                    { label: '유진투자증권', value: '280', },
                    { label: '메리츠증권', value: '287', },
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

                let query = {
                    telegramNo: '999999',
                    bankCode: bank_code,
                    account: acct_num,
                }
                let { data: response } = await axios.post(`${API_URL}/????`, query, {
                    headers: getDefaultHeader(dns_data, pay_type)
                });
                if (response?.status == 200) {
                    return {
                        code: 100,
                        message: 'success',
                        data: {
                            withdraw_acct_name: response?.depositor
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.status,
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
        request: async (data) => {//출금신청
            try {
                let {
                    dns_data,
                    pay_type,
                    trx_id,
                    amount,
                    bank_code,
                    acct_num,
                } = data;

                let query = {
                    telegramNo: trx_id,
                    rvBankCode: bank_code,
                    rvAccount: acct_num,
                    amount: amount,
                }
                let { data: response } = await axios.post(`${API_URL}/api/rt/v1/transfer`, query, {
                    headers: getDefaultHeader(dns_data, pay_type)
                });
                if (response?.status == 200) {
                    return {
                        code: 100,
                        message: 'success',
                        data: {
                            tid: response?.natv_tr_no,
                        },
                    };
                } else {
                    return {
                        code: -100,
                        message: response?.status,
                        data: {},
                    }
                }


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
                    tid,
                    date,
                } = data;

                let query = {
                    trDt: date,
                    orgTelegramNo: tid,
                }
                let { data: response } = await axios.post(`${API_URL}/api/rt/v1/transfer/check`, query, {
                    headers: getDefaultHeader(dns_data, pay_type)
                });
                let status = 0;
                if (response?.status == 200) {
                    status = 0;
                } else {
                    status = 3;
                }
                if (response?.status == 200) {
                    return {
                        code: 100,
                        message: 'success',
                        data: {
                            status,
                        },
                    };
                }
                return {
                    code: -100,
                    message: response?.status,
                    data: {
                        status
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