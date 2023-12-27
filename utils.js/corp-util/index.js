import { selectQuerySimple } from "../query-util.js";
import { banknersApi } from "./bankners.js";

const getDnsData = async (data_, dns_data_) => {
    let dns_data = await selectQuerySimple('brands', dns_data_?.id);
    dns_data = dns_data?.result[0];
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
            let { dns_data } = data;
            data = await getDnsData(data, dns_data);
            let result = default_result;
            if (dns_data?.deposit_corp_type == 1) {
                result = await banknersApi.user.info(data);
            }
            return result;
        },
        create: async (data_) => {//유저정보 출력
            let data = data_;
            let { dns_data } = data;
            data = await getDnsData(data, dns_data);
            let result = default_result;

            if (dns_data?.deposit_corp_type == 1) {
                result = await banknersApi.user.create(data);
            }
            return result;
        },
        account: async (data_) => {//출금계좌등록
            let data = data_;
            let { dns_data } = data;
            data = await getDnsData(data, dns_data);
            let result = default_result;

            if (dns_data?.deposit_corp_type == 1) {
                result = await banknersApi.user.account(data);
            }
            return result;
        },
        account_verify: async (data_) => {//출금계좌등록
            let data = data_;
            let { dns_data } = data;
            data = await getDnsData(data, dns_data);
            let result = default_result;

            if (dns_data?.deposit_corp_type == 1) {
                result = await banknersApi.user.account_verify(data);
            }
            return result;
        },
    },
    bank: {
        list: async (data_) => {//은행정보 출력
            let data = data_;
            let { dns_data } = data;
            data = await getDnsData(data, dns_data);
            let result = default_result;
            if (dns_data?.deposit_corp_type == 1) {
                result = await banknersApi.bank.list(data);
            }
            return result;
        },
    },
    vaccount: async (data_) => {//가상계좌발급
        let data = data_;
        let { dns_data } = data;
        data = await getDnsData(data, dns_data);
        let result = default_result;
        if (dns_data?.deposit_corp_type == 1) {
            result = await banknersApi.vaccount(data);
        }
        return result;
    },
    push: {
        create: async (data_) => {//푸시 url등록
            let data = data_;
            let { dns_data } = data;
            data = await getDnsData(data, dns_data);
            let result = default_result;
            if (dns_data?.deposit_corp_type == 1) {
                result = await banknersApi.push.create(data);
            }
            return result;
        },
        update: async (data_) => {//푸시 url등록
            let data = data_;
            let { dns_data } = data;
            data = await getDnsData(data, dns_data);
            let result = default_result;
            if (dns_data?.deposit_corp_type == 1) {
                result = await banknersApi.push.update(data);
            }
            return result;
        },
    },
}

export default corpApi;