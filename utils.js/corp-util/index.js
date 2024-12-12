import { selectQuerySimple } from "../query-util.js";
import { banknersApi } from "./bankners.js";
import { cooconApi } from "./coocon.js";
import { hectoApi } from "./hecto.js";
import { icbApi } from "./icb.js";
import { koreaPaySystemApi } from "./korea-pay-system.js";
import { paytusApi } from "./paytus.js";

const getDnsData = async (data_, dns_data_) => {
    let dns_data = await selectQuerySimple('brands', dns_data_?.id);
    dns_data = dns_data[0];
    let data = data_;
    data['dns_data'] = dns_data;
    return data;
}
const default_result = {
    code: -100,
    data: {},
    message: ''
};
const corpApi = {
    user: {
        info: async (data_) => {//유저정보 출력
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.user.info(data);
            }
            return result;
        },
        create: async (data_) => {//유저정보 출력
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }

            if (corp_type == 1) {
                result = await banknersApi.user.create(data);
            }
            return result;
        },
        account: async (data_) => {//출금계좌등록
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }

            if (corp_type == 1) {
                result = await banknersApi.user.account(data);
            }
            if (corp_type == 3) {
                result = await paytusApi.user.account(data);
            }
            if (corp_type == 6) {
                result = await koreaPaySystemApi.user.account(data);
            }
            if (corp_type == 7) {
                result = await icbApi.user.account(data);
            }
            return result;
        },
        account_verify: async (data_) => {//출금계좌등록
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }

            if (corp_type == 1) {
                result = await banknersApi.user.account_verify(data);
            }
            if (corp_type == 3) {
                result = await paytusApi.user.account_verify(data);
            }
            if (corp_type == 6) {
                result = await koreaPaySystemApi.user.account_verify(data);
            }
            if (corp_type == 7) {
                result = await icbApi.user.account_verify(data);
            }
            return result;
        },
        check_real_name: async (data_) => {//실명인증
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }

            if (corp_type == 3) {
                result = await paytusApi.user.check_real_name(data);
            }
            return result;
        },
    },
    sms: {
        push: async (data_) => {//이체
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.sms.push(data);
            }
            if (corp_type == 3) {
                result = await paytusApi.sms.push(data);
            }
            if (corp_type == 6) {
                result = await koreaPaySystemApi.sms.push(data);
            }
            if (corp_type == 7) {
                result = await icbApi.sms.push(data);
            }
            return result;
        },
        check: async (data_) => {//이체
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.sms.check(data);
            }
            if (corp_type == 3) {
                result = await paytusApi.sms.check(data);
            }
            if (corp_type == 6) {
                result = await koreaPaySystemApi.sms.check(data);
            }
            if (corp_type == 7) {
                result = await icbApi.sms.check(data);
            }
            return result;
        },
    },
    account: {
        info: async (data_) => {//이체
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }

            if (corp_type == 2) {
                result = await cooconApi.account.info(data);
            }
            if (corp_type == 6) {
                result = await koreaPaySystemApi.account.info(data);
            }
            if (corp_type == 7) {
                result = await icbApi.account.info(data);
            }
            return result;
        },
    },
    transfer: {
        pass: async (data_) => {//이체
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }

            if (corp_type == 1) {
                result = await banknersApi.transfer.pass(data);
            }
            return result;
        },
    },
    balance: {
        info: async (data_) => {//유저정보 출력
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.balance.info(data);
            }
            if (corp_type == 2) {
                result = await cooconApi.balance.info(data);
            }
            if (corp_type == 5) {
                result = await hectoApi.balance.info(data);
            }
            if (corp_type == 6) {
                result = await koreaPaySystemApi.balance.info(data);
            }
            if (corp_type == 7) {
                result = await icbApi.balance.info(data);
            }
            return result;
        },
    },
    bank: {
        list: async (data_) => {//은행정보 출력
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.bank.list(data);
            }
            return result;
        },
    },
    vaccount: async (data_) => {//가상계좌발급
        let data = data_;
        let { dns_data, pay_type } = data;
        data = await getDnsData(data, dns_data);
        dns_data = data?.dns_data;
        let result = default_result;
        let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
        if (dns_data?.setting_obj?.is_use_deposit == 1) {
            corp_type = dns_data?.deposit_corp_type;
        } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
            corp_type = dns_data?.withdraw_corp_type;
        }
        if (pay_type) {
            corp_type = dns_data[`${pay_type}_corp_type`];
        }
        if (corp_type == 1) {
            result = await banknersApi.vaccount(data);
        }
        if (corp_type == 3) {
            result = await paytusApi.vaccount(data);
        }
        if (corp_type == 7) {
            result = await icbApi.vaccount(data);
        }
        return result;
    },
    push: {
        create: async (data_) => {//푸시 url등록
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.push.create(data);
            }
            return result;
        },
        update: async (data_) => {//푸시 url등록
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.push.update(data);
            }
            return result;
        },
    },
    mother: {
        to: async (data_) => {//은행정보 출력
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;
            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.mother.to(data);
            }
            return result;
        },
    },
    withdraw: {
        request: async (data_) => {//출금요청
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;

            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.withdraw.request(data);
            }
            if (corp_type == 2) {
                result = await cooconApi.withdraw.request(data);
            }
            if (corp_type == 5) {
                result = await hectoApi.withdraw.request(data);
            }
            if (corp_type == 6) {
                result = await koreaPaySystemApi.withdraw.request(data);
            }
            if (corp_type == 7) {
                result = await icbApi.withdraw.request(data);
            }
            return result;
        },
        request_check: async (data_) => {//출금요청
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;

            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }

            if (corp_type == 2) {
                result = await cooconApi.withdraw.request_check(data);
            }
            if (corp_type == 5) {
                result = await hectoApi.withdraw.request_check(data);
            }
            if (corp_type == 7) {
                result = await icbApi.withdraw.request_check(data);
            }
            return result;
        },
    },
    gift: {
        order: async (data_) => {//출금요청
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;

            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.gift.order(data);
            }
            return result;
        },
        auth: async (data_) => {//출금요청
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;

            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.gift.auth(data);
            }
            return result;
        },
        use: async (data_) => {//출금요청
            let data = data_;
            let { dns_data, pay_type } = data;
            data = await getDnsData(data, dns_data);
            dns_data = data?.dns_data;

            let result = default_result;
            let corp_type = dns_data?.deposit_corp_type || dns_data?.withdraw_corp_type;
            if (dns_data?.setting_obj?.is_use_deposit == 1) {
                corp_type = dns_data?.deposit_corp_type;
            } else if (dns_data?.setting_obj?.is_use_withdraw == 1) {
                corp_type = dns_data?.withdraw_corp_type;
            }
            if (pay_type) {
                corp_type = dns_data[`${pay_type}_corp_type`];
            }
            if (corp_type == 1) {
                result = await banknersApi.gift.use(data);
            }
            return result;
        },
    },
}

export default corpApi;