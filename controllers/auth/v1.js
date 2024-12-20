'use strict';
import { readPool } from "../../config/db-pool.js";
import { hectoApi } from "../../utils.js/corp-util/hecto.js";
import { insertQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, commarNumber, getOperatorList, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import speakeasy from 'speakeasy';
//헥토활용 api
const authV1Ctrl = {
    phone: {
        request: async (req, res, next) => {
            try {
                const {
                    api_key,
                    mid,
                    phone_num,
                    name,
                    gender,
                    birth,
                    tel_com,
                } = req.body;

                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", false);
                }
                if (
                    !phone_num ||
                    !name ||
                    !gender ||
                    !birth ||
                    !tel_com
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                if (!mid) {
                    return response(req, res, -100, "가맹점을 선택해 주세요.", false);
                }
                if (birth.length != 8) {
                    return response(req, res, -100, "생년월일 형식은 yyyymmdd 입니다.", false);
                }
                let dns_data = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data[0][0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", false);
                }
                dns_data['operator_list'] = getOperatorList(dns_data);

                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "존재하지 않는 가맹점 mid 입니다.", false)
                }
                let api_result = await hectoApi.mobile.request({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                    phone_num,
                    name,
                    gender,
                    birth: birth.substring(2, 8),
                    tel_com,
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                console.log(api_result);
                let insert_auth_logs = await insertQuery(`phone_auth_histories`, {
                    brand_id: dns_data?.id,
                    mcht_id: mcht?.id,
                    tid: api_result?.data?.tid,
                    trd_no: api_result?.data?.trd_no,
                    phone_num: phone_num,
                    name: name,
                    amount: dns_data?.auth_fee ?? 0,
                })
                return response(req, res, 100, "success", {
                    tid: api_result?.data?.tid,
                    trd_no: api_result?.data?.trd_no,
                })

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req, res, next) => {
            try {
                const {
                    api_key,
                    mid,
                    tid,
                    trd_no,
                    vrf_word
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                if (
                    !tid ||
                    !trd_no ||
                    !vrf_word
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                let dns_data = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data[0][0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                dns_data['operator_list'] = getOperatorList(dns_data);
                if (!mid) {
                    return response(req, res, -100, "가맹점을 선택해 주세요.", false);
                }
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "존재하지 않는 가맹점 mid 입니다.", false)
                }
                let api_result = await hectoApi.mobile.check({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                    tid,
                    trd_no,
                    vrf_word,
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }


                return response(req, res, 100, "success", {})

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    },
    account: {
        request: async (req, res, next) => {
            try {
                const {
                    api_key,
                    mid,
                    deposit_bank_code,
                    deposit_acct_num,
                    deposit_acct_name,
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                if (
                    !deposit_bank_code ||
                    !deposit_acct_num ||
                    !deposit_acct_name
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                let dns_data = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data[0][0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "존재하지 않는 가맹점 mid 입니다.", false)
                }
                let api_result = await hectoApi.account.info({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    name: deposit_acct_name,
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                if (api_result.data?.name != deposit_acct_name) {
                    return response(req, res, -100, "예금주명이 일치하지 않습니다.", false)
                }
                let api_result2 = await hectoApi.user.account({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    name: deposit_acct_name,
                })
                if (api_result2?.code != 100 && api_result2?.message != '처리중 요청이 있음') {
                    return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), false)
                }
                return response(req, res, 100, "success", {
                    mcht_trd_no: api_result2.data?.mcht_trd_no,
                    mcht_cust_id: api_result2.data?.mcht_cust_id,
                })
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req, res, next) => {
            try {
                const {
                    api_key,
                    mid,
                    mcht_trd_no,
                    mcht_cust_id,
                    vrf_word,
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                if (
                    !mcht_trd_no ||
                    !mcht_cust_id ||
                    !vrf_word
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                let dns_data = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data[0][0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "존재하지 않는 가맹점 mid 입니다.", false)
                }
                let api_result = await hectoApi.user.account_verify({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                    mcht_trd_no,
                    mcht_cust_id,
                    vrf_word,
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }

                return response(req, res, 100, "success", {})

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    }
};

export default authV1Ctrl;
