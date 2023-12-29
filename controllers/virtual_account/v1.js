'use strict';
import db, { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';

const table_name = 'virtual_accounts';

const virtualAccountV1Ctrl = {
    guid: async (req, res, next) => {//회원 생년월일 및 휴대폰 번호 및 이름으로 guid 출력
        try {
            const {
                birth,
                phone_num,
            } = req.body;

            let virtual_account = await pool.query(`SELECT * FROM ${table_name} FROM birth=? AND phone_num=?`, [
                birth,
                phone_num
            ])
            virtual_account = virtual_account?.result[0];

            return response(req, res, 100, "success", {
                guid: virtual_account?.guid
            })
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
    info: async (req, res, next) => {//guid를 통해 해당 유저의 출금계좌 및 가상계좌 정보출력
        try {
            const {
                guid
            } = req.body;

        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
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
            let virtual_account_id = 0;
            if (guid) {
                let virtual_account = await pool.query(`SELECT * FROM ${table_name} WHERE guid=? AND brand_id=?`, [
                    guid,
                    brand?.id,
                ])
                virtual_account = virtual_account?.result[0];
                virtual_account_id = virtual_account?.id;
                if (!virtual_account) {
                    await db.rollback();
                    return response(req, res, -100, "유저를 찾을 수 없습니다.", data)
                }

                if (virtual_account?.deposit_acct_check == 1) {
                    await db.rollback();
                    return response(req, res, -100, "이미 인증완료된 계좌입니다.", data)
                }
            } else {
                let virtual_account = await pool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND birth=? AND brand_id=?`, [
                    phone_num,
                    birth,
                    brand?.id,
                ])
                virtual_account = virtual_account?.result[0];
                if (virtual_account) {
                    await db.rollback();
                    return response(req, res, -100, "이미 등록된 유저입니다.", data)
                }
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
                    await db.rollback();
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
                }
                data['guid'] = api_result.data?.guid;
                let insert_virtual_account = await insertQuery(`${table_name}`, {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    deposit_acct_name: name,
                    phone_num: phone_num,
                    birth: birth,
                    email: email,
                    status: 5,
                    guid: data.guid,
                })
                virtual_account_id = insert_virtual_account?.result?.insertId;
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
            let update_virtual_account = await updateQuery(`${table_name}`, {
                deposit_bank_code: bank_code,
                deposit_acct_num: account,
                deposit_acct_name: name,
                deposit_tid: data.tid,
            }, virtual_account_id)
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

            let virtual_account = await pool.query(`SELECT * FROM ${table_name} WHERE brand_id=? AND guid=?`, [
                brand?.id,
                guid,
            ]);
            virtual_account = virtual_account?.result[0];
            if (!virtual_account) {
                return response(req, res, -100, "유저를 찾을 수 없습니다.", false)
            }
            if (virtual_account?.deposit_acct_check == 1) {
                return response(req, res, -100, "이미 인증완료된 계좌입니다.", false)
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
            let update_virtual_account = await updateQuery(`${table_name}`, {
                deposit_acct_check: 1,
            }, virtual_account?.id)
            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
    issuance: async (req, res, next) => {//발급
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                mid,
                guid,
            } = req.body;
            console.log(mid)
            console.log(guid)
            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                return response(req, res, -100, "가맹점을 찾을 수 없습니다.", {})
            }

            let brand = await pool.query(`SELECT * FROM brands WHERE id=${mcht?.brand_id}`);
            brand = brand?.result[0];

            let virtual_account = await pool.query(`SELECT * FROM ${table_name} WHERE brand_id=? AND guid=?`, [
                brand?.id,
                guid,
            ]);
            virtual_account = virtual_account?.result[0];
            if (!virtual_account) {
                return response(req, res, -100, "잘못된 접근입니다.", {})
            }

            let data = {
                mid,
                guid,
            }
            let api_result2 = await corpApi.vaccount({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                guid: virtual_account?.guid,
            })
            if (api_result2.code != 100) {
                return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), data)
            }
            data = {
                bank_id: api_result2.data?.bank_id,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                virtual_acct_name: api_result2.data?.virtual_acct_name,
                tid: api_result2.data?.tid,
            }

            let result = await updateQuery(`${table_name}`, {
                virtual_bank_code: api_result2.data?.bank_id,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                virtual_acct_name: api_result2.data?.virtual_acct_name,
                tid: api_result2.data?.tid,
                status: 0,
            }, virtual_account?.id)
            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
};

export default virtualAccountV1Ctrl;
