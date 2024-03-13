import axios from "axios";
import { returnMoment } from "../function.js";

const API_URL = `https://api.kp-pay.com`;

const makeHeaderData = (dns_data, pay_type) => {
    return {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `${dns_data[`${pay_type}_sign_key`]}`,
    }
}

const processBodyObj = (obj_ = {}, dns_data, pay_type, object_type = 'vact') => {
    let obj = obj_;
    obj = {
        ...obj,
        mchtId: dns_data[`${pay_type}_api_id`]
    }
    obj = {
        [object_type]: obj,
    }
    return obj;
}
//

const checkVirtualAccountGet = async (dns_data, pay_type) => {
    let first_query = {
        banks: [dns_data[`${pay_type}_virtual_bank_code`]],
    };
    first_query = processBodyObj(first_query, dns_data, pay_type);
    let virtual_issue_time = returnMoment();

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
    return {
        code: 100,
        message: '',
        data: {
            virtual_bank_code,
            virtual_acct_num,
            virtual_issue_time,
        },
    }
}
export const koreaPaySystemApi = {
    balance: {
        info: async (data) => {
            try {
                let { dns_data, pay_type, decode_user,
                    tid, vrf_word,
                } = data;
                let query = {
                    authNo: tid,
                    oneCertiInNo: vrf_word,
                }
                query = processBodyObj(query, dns_data, pay_type);
                let { data: result } = await axios.get(`${API_URL}/api/settle/balance`, {
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
                        amount: result.balance?.balance,
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
    user: {
        account: async (data) => {
            let { dns_data, pay_type, decode_user,
                email, name, phone_num, birth,
                user_type,
                business_num, company_name, ceo_name, company_phone_num,
                deposit_bank_code, deposit_acct_num, deposit_acct_name,
                virtual_bank_code, virtual_acct_num, virtual_issue_time,
            } = data;
            let ci = `${new Date().getTime()}` + phone_num + birth;
            try {
                //발급 가능한 가상계좌 확인
                let is_time_over = true;
                if (virtual_acct_num) {
                    let return_moment = returnMoment();
                    let now_time = new Date(return_moment).getTime();
                    let ago_time = new Date(virtual_issue_time).getTime();
                    if (now_time - ago_time < 1000 * 180) {
                        is_time_over = false;
                    }
                }

                if (!virtual_acct_num || is_time_over) {
                    let new_virtual_account = await checkVirtualAccountGet(dns_data, pay_type);
                    if (new_virtual_account?.code < 0) {
                        return {
                            code: -100,
                            message: new_virtual_account.message,
                            data: {

                            },
                        };
                    }
                    virtual_bank_code = new_virtual_account.data?.virtual_bank_code;
                    virtual_acct_num = new_virtual_account.data?.virtual_acct_num;
                    virtual_issue_time = new_virtual_account.data?.virtual_issue_time;
                }
                let auth_num = birth.substring(2, birth.length);
                if (user_type == 0) {
                    user_type = '1';
                } else if (user_type == 1) {
                    user_type = '2';
                    auth_num = business_num;
                } else if (user_type == 2) {
                    user_type = '2';
                    auth_num = business_num;
                }
                let query = {
                    trxType: '0',
                    account: virtual_acct_num,
                    withdrawBankCd: deposit_bank_code,
                    withdrawAccount: deposit_acct_num,
                    identity: auth_num,
                    phoneNo: phone_num,
                    ci,
                    name: deposit_acct_name,
                    holderName: deposit_acct_name,
                    regType: user_type,
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
                        virtual_issue_time,
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
    account: {
        info: async (data) => {//예금주명조회
            try {
                let { dns_data, pay_type, decode_user,
                    bank_code, acct_num, birth
                } = data;
                let query = {
                    account: acct_num,
                    bankCd: bank_code,
                    identity: birth,
                }
                query = processBodyObj(query, dns_data, pay_type, "accnt");
                let { data: result } = await axios.post(`${API_URL}/api/settle/accnt`, query, {
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
                        withdraw_acct_name: result?.accnt?.holder,
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
        request: async (data) => {//출금신청
            try {
                let { dns_data, pay_type, decode_user,
                    guid, amount,
                    bank_code,
                    acct_num,
                    acct_name,
                } = data;

                let query = {
                    amount: amount,
                    trackId: `${dns_data?.id ?? 0}-${decode_user?.id ?? 0}-${new Date().getTime()}`,
                    bankCd: bank_code,
                    account: acct_num,
                    recordInfo: acct_name,
                }
                query = processBodyObj(query, dns_data, pay_type, "transfer");
                console.log(query)

                let { data: result } = await axios.post(`${API_URL}/api/settle/transfer`, query, {
                    headers: makeHeaderData(dns_data, pay_type)
                });
                console.log(result)
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
                        tid: result?.transfer?.trxId,
                        top_amount: result?.transfer?.fee,
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