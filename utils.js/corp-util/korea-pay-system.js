import axios from "axios";
import { returnMoment } from "../function.js";

const API_URL = `https://api.kp-pay.com`;

const makeHeaderData = (dns_data, pay_type) => {
    return {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `${dns_data[`${pay_type}_sign_key`]}`,
    }
}

const processBodyObj = (obj_ = {}, dns_data, pay_type) => {
    let obj = obj_;
    obj = {
        ...obj,
        mchtId: dns_data[`${pay_type}_api_id`]
    }
    obj = {
        "vact": obj,
    }
    return obj;
}
//
export const koreaPaySystemApi = {
    user: {
        account: async (data) => {
            let { dns_data, pay_type, decode_user,
                email, name, phone_num, birth,
                user_type,
                business_num, company_name, ceo_name, company_phone_num,
                deposit_bank_code, deposit_acct_num, deposit_acct_name,
            } = data;
            let ci = `${new Date().getTime()}` + phone_num + birth;
            try {
                //발급 가능한 가상계좌 확인
                let first_query = {
                    banks: [dns_data[`${pay_type}_virtual_bank_code`]],
                };
                first_query = processBodyObj(first_query, dns_data, pay_type);
                let { data: virtual_account_result } = await axios.post(`${API_URL}/api/vact/withdrawGet`, first_query, {
                    headers: makeHeaderData(dns_data, pay_type)
                });
                if (virtual_account_result?.result?.resultCd != '0000') {
                    return {
                        code: -100,
                        message: virtual_account_result?.result?.advanceMsg,
                        data: {},
                    };
                }

                let virtual_bank_code = virtual_account_result?.vact?.vacts[0]?.bankCd;
                let virtual_acct_num = virtual_account_result?.vact?.vacts[0]?.account;
                if (user_type == 0) {
                    user_type = '1';
                } else if (user_type == 1) {
                    user_type = '2';
                } else if (user_type == 2) {
                    user_type = 'PERSONAL_BIZ';
                }
                let query = {
                    trxType: '0',
                    account: virtual_acct_num,
                    withdrawBankCd: deposit_bank_code,
                    withdrawAccount: deposit_acct_num,
                    identity: birth.substring(2, birth.length),
                    phoneNo: phone_num,
                    ci,
                    name: deposit_acct_name,
                    holderName: deposit_acct_name,
                }
                query = processBodyObj(query, dns_data, pay_type);
                let { data: result } = await axios.post(`${API_URL}/api/vact/regcerti`, query, {
                    headers: makeHeaderData(dns_data, pay_type)
                });
                if (result?.result?.resultCd != '0000') {
                    return {
                        code: -100,
                        message: result?.result?.advanceMsg,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: result?.message,
                    data: {
                        virtual_bank_code,
                        virtual_acct_num,
                        tid: result?.vact?.authNo,
                        ci,
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
                    tid, vrf_word,
                } = data;
                let query = {
                    authNo: tid,
                    oneCertiInNo: vrf_word,
                }
                query = processBodyObj(query, dns_data, pay_type);
                let { data: result } = await axios.post(`${API_URL}/api/vact/regcheck`, query, {
                    headers: makeHeaderData(dns_data, pay_type)
                });
                if (result?.result?.resultCd != '0000') {
                    return {
                        code: -100,
                        message: result?.result?.advanceMsg,
                        data: {},
                    };
                }
                return {
                    code: 100,
                    message: result?.message,
                    data: {
                        tid: result?.vact?.issueId,
                        virtual_acct_num: result?.vact?.account,
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
    },
}