'use strict';
import db, { pool } from "../../config/db.js";
import { hectoApi } from "../../utils.js/corp-util/hecto.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, getUserWithDrawFee, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, commarNumber, getOperatorList, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import speakeasy from 'speakeasy';
const table_name = 'deposits';
//더즌활용 api
const depositV1Ctrl = {
    create: async (req, res, next) => {
        try {
            const {
                api_key,
                mid, amount, deposit_bank_code, deposit_acct_num, deposit_acct_name
            } = req.body;

            let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            dns_data = dns_data?.result[0];
            dns_data['operator_list'] = getOperatorList(dns_data);
            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
            mcht = mcht?.result[0];
            let obj = {
                brand_id: dns_data?.id,
                expect_amount: amount,
                deposit_bank_code,
                deposit_acct_num,
                deposit_acct_name,
                mcht_id: mcht?.id,
                deposit_fee: mcht?.deposit_fee,
                deposit_status: 5,
            };

            let result = await insertQuery(table_name, obj);

            return response(req, res, 100, "success", {})

        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
    phone: {
        request: async (req, res, next) => {
            try {
                const {
                    api_key,
                    mid,
                    phone_num,
                    name,
                } = req.body;

                let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                dns_data = dns_data?.result[0];
                dns_data['operator_list'] = getOperatorList(dns_data);
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];

                let result = hectoApi.mobile.request({
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
                let result = hectoApi.mobile.check({
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

                let result2 = hectoApi.user.account({
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
                let result = hectoApi.user.account_verify({
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

export default depositV1Ctrl;
