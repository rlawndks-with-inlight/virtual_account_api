import axios from "axios";

const API_URL = `https://api.cashes.co.kr`;

export const paytusApi = {
    user: {
        account: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    deposit_bank_code, deposit_acct_num, deposit_acct_name,
                } = data;
                let query = {
                    compUuid: 'HSTUWO',
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
        account_verify: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    verify_tr_dt,
                    verify_tr_no,
                    vrf_word,
                } = data;
                let query = {
                    compUuid: 'HSTUWO',
                    verifyTrDt: verify_tr_dt,
                    verifyTrNo: verify_tr_no,
                    verifyVal: vrf_word,
                }
                let { data: result } = await axios.post(`${API_URL}/api/v1/viss/confirm`, query);

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
                    compUuid: 'HSTUWO',
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
    sms: {
        push: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    deposit_acct_name, auth_num,
                    gender, ntv_frnr, tel_com, phone_num
                } = data;
                let query = {
                    compUuid: 'HSTUWO',
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
        check: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    tx_seq_no, phone_num, vrf_word,
                } = data;
                let query = {
                    compUuid: 'HSTUWO',
                    txSeqNo: tx_seq_no,
                    telNo: phone_num,
                    otpNo: vrf_word,
                }
                let { data: result } = await axios.post(`${API_URL}/api/v1/viss/smsResult`, query);

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