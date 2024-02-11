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
                console.log(123)
                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];

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
                } = req.body;

                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                let result = await hectoApi.mobile.check({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                })
                console.log(result);

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
                } = req.body;

                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];

                let result = hectoApi.account.info({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                })
                console.log(result);

                let result2 = await hectoApi.user.account({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                })
                console.log(result2);

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
                } = req.body;

                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                let result = await hectoApi.user.account_verify({
                    pay_type: 'deposit',
                    dns_data,
                    decode_user: mcht,
                })
                console.log(result);

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
