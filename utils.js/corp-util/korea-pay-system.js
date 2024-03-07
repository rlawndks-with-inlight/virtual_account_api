import axios from "axios";
import { returnMoment } from "../function.js";

const API_URL = `https://api.kp-pay.com`;

const getDefaultBody = (dns_data, pay_type) => {

    return {
        compUuid: dns_data[`${pay_type}_guid`],
    }
}
export const koreaPaySystemApi = {
    user: {
        account: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    deposit_bank_code, deposit_acct_num, deposit_acct_name,
                } = data;
                let query = {
                    ...getDefaultBody(dns_data, pay_type),
                    bankCode: deposit_bank_code,
                    acctNo: deposit_acct_num,
                    custNm: deposit_acct_name,
                }
                let { data: result } = await axios.post(`${API_URL}/api/v1/viss/acct`, query);
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
                        verify_tr_no: result?.response?.verifyTrNo,
                        verify_tr_dt: result?.response?.verifyTrDt,
                    },
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
        account_verify: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    verify_tr_dt,
                    verify_tr_no,
                    vrf_word,
                } = data;
                let query = {
                    ...getDefaultBody(dns_data, pay_type),
                    verifyTrDt: verify_tr_dt,
                    verifyTrNo: verify_tr_no,
                    verifyVal: vrf_word,
                }
                let { data: result } = await axios.post(`${API_URL}/api/v1/viss/confirm`, query);
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
                    message: result?.message,
                    data: result?.response,
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
        check_real_name: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    deposit_bank_code, deposit_acct_num, deposit_acct_name, auth_num
                } = data;
                let query = {
                    ...getDefaultBody(dns_data, pay_type),
                    bankCode: deposit_bank_code,
                    acctNo: deposit_acct_num,
                    custNm: deposit_acct_name,
                    regNo: auth_num,
                }
                let { data: result } = await axios.post(`${API_URL}/api/v1/viss/realDepositor`, query);

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
                    data: result?.response,
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
            let { dns_data, pay_type, decode_user,
                deposit_bank_code, deposit_acct_num, deposit_acct_name,
                birth, phone_num
            } = data;
            let query = {
                ...getDefaultBody(dns_data, pay_type),
                custNm: deposit_acct_name,
                custTermDttm: returnMoment().replaceAll('-', '').replaceAll(':', '').replaceAll(' ', ''),
                custBankCode: deposit_bank_code,
                custBankAcct: deposit_acct_num,
                custPhoneNo: phone_num,
                custBirth: birth,
            }
            let { data: result } = await axios.post(`${API_URL}/api/v1/vips/request`, query);

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
                    bank_code: result?.response?.bankCode,
                    acct_num: result?.response?.bankAcctNo,
                },
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
    sms: {
        push: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    deposit_acct_name, auth_num,
                    gender, ntv_frnr, tel_com, phone_num
                } = data;
                let query = {
                    ...getDefaultBody(dns_data, pay_type),
                    custNm: deposit_acct_name,
                    custBirth: auth_num,
                    sexCd: gender,
                    ntvFrnrCd: ntv_frnr,
                    telComCd: tel_com,
                    telNo: phone_num,
                    agree1: 'Y',
                    agree2: 'Y',
                    agree3: 'Y',
                    agree4: 'Y',
                }
                let { data: result } = await axios.post(`${API_URL}/api/v1/viss/smsPush`, query);

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
                        tx_seq_no: result?.response?.txSeqNo,
                    },
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
        check: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    tx_seq_no, phone_num, vrf_word,
                } = data;
                let query = {
                    ...getDefaultBody(dns_data, pay_type),
                    txSeqNo: tx_seq_no,
                    telNo: phone_num,
                    otpNo: vrf_word,
                }
                console.log(query)
                let { data: result } = await axios.post(`${API_URL}/api/v1/viss/smsResult`, query);
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
                    message: result?.message,
                    data: result?.response,
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
}