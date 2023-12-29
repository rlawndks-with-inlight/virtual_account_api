'use strict';
import db, { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';

const table_name = 'virtual_accounts';

const virtualAccountV1Ctrl = {
    request: async (req, res, next) => {//발급요청
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                mid,
                bank_code,
                account,
                name,
                birth,
                phone_num,
                guid,//필수아님
            } = req.body;
            let email = `${Math.random().toString(16).substring(2, 8)}@naver.com`

            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                return response(req, res, -100, "가맹점을 찾을 수 없습니다.", false)
            }

            let brand = await pool.query(`SELECT * FROM brands WHERE id=${mcht?.brand_id}`);
            brand = brand?.result[0];

            await db.beginTransaction();
            let data = {
                guid: guid,
                tid: '',
            };
            let user = {};
            if (guid) {
                let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE guid=? AND brand_id=?`, [
                    guid,
                    brand?.id,
                ])
                virtual_account = virtual_account?.result[0];
                if (!virtual_account) {
                    return response(req, res, -100, "유저를 찾을 수 없습니다.", data)
                }

            } else {
                let api_result = await corpApi.user.create({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    email,
                    name: name,
                    phone_num: phone_num,
                    birth: birth,
                })
                if (api_result.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
                }
                data['guid'] = api_result.data?.guid;
            }
            let api_result2 = await corpApi.user.account({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                deposit_bank_code: bank_code,
                deposit_acct_num: account,
                deposit_acct_name: name,
                guid: data.guid,
                birth: birth,
            })

            if (api_result2.code != 100) {
                if (api_result2.message == '이미 등록된 계좌가 있습니다.') {

                }
                return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), data)
            }
            data.tid = api_result2.data?.tid;
            if (!guid) {
                let insert_virtual_account = await insertQuery(`virtual_accounts`, {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    deposit_bank_code: bank_code,
                    deposit_acct_num: account,
                    deposit_acct_name: name,
                    phone_num: phone_num,
                    birth: birth,
                    email: email,
                    status: 5,
                    guid: data.guid,
                    deposit_tid: data.tid,
                })
            }
            await db.commit();
            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            await db.rollback();
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
    check: async (req, res, next) => {// 1원인증
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                mid,
                tid,
                vrf_word,
                guid,
            } = req.body;
            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                return response(req, res, -100, "가맹점을 찾을 수 없습니다.", false)
            }
            let brand = await pool.query(`SELECT * FROM brands WHERE id=${mcht?.brand_id}`);
            brand = brand?.result[0];

            let data = {};

            let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE brand_id=? AND guid=?`, [
                brand?.id,
                guid,
            ]);
            virtual_account = virtual_account?.result[0];
            if (!virtual_account) {
                return response(req, res, -100, "잘못된 접근입니다.", false)
            }

            let api_result = await corpApi.user.account_verify({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                tid,
                vrf_word
            })
            if (api_result.code != 100) {
                return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
            }
            data.tid = api_result.data?.tid;
            let update_virtual_account = await updateQuery(`virtual_accounts`, {
                deposit_acct_check: 1,
            }, virtual_account?.id)
            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
    issuance: async (req, res, next) => {// 1원인증및발급
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                mid,
                tid,
                vrf_word,
                guid,
            } = req.body;
            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                return response(req, res, -100, "가맹점을 찾을 수 없습니다.", {})
            }

            let brand = await pool.query(`SELECT * FROM brands WHERE id=${mcht?.brand_id}`);
            brand = brand?.result[0];

            let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE brand_id=? AND guid=?`, [
                brand?.id,
                guid,
            ]);
            virtual_account = virtual_account?.result[0];
            if (!virtual_account) {
                return response(req, res, -100, "잘못된 접근입니다.", {})
            }

            let data = {
            }
            let api_result2 = await corpApi.vaccount({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                guid: virtual_account?.guid,
            })
            data = {
                bank_id: api_result2.data?.bank_id,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                virtual_acct_name: api_result2.data?.virtual_acct_name,
                tid: api_result2.data?.tid,
            }
            let result = await pool.query(`UPDATE virtual_accounts SET virtual_bank_code=?, virtual_acct_num=?, virtual_acct_name=?, tid=?, status=0 WHERE id=${virtual_account?.id}`, [
                api_result2.data?.bank_id,
                api_result2.data?.virtual_acct_num,
                api_result2.data?.virtual_acct_name,
                api_result2.data?.tid,
            ])
            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
};

export default virtualAccountV1Ctrl;
