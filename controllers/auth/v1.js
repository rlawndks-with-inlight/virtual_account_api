'use strict';
import db, { pool } from "../../config/db.js";
import { hectoApi } from "../../utils.js/corp-util/hecto.js";
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
                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", false);
                }
                dns_data['operator_list'] = getOperatorList(dns_data);

                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
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
                    birth,
                    tel_com,
                })
                if (api_result?.code != 100) {
                    await db.rollback();
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                console.log(api_result);
                return response(req, res, 100, "success", {})

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
                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
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
                    await db.rollback();
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
                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
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
                    await db.rollback();
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
                    await db.rollback();
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
                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                if (!dns_data) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
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
                    await db.rollback();
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
