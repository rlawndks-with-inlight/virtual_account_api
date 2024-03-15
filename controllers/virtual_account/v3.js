'use strict';
import db, { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, generateRandomString, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import logger from "../../utils.js/winston/index.js";
const table_name = 'virtual_accounts';
//코리아결제활용
const virtualAccountV3Ctrl = {
    request: async (req_, res, next) => {//발급요청
        let req = req_;
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            let {
                api_key,
                mid,
                bank_code,
                account,
                name,
                birth,
                phone_num,
                user_id = 0,
                user_type = 0,
                business_num,
                company_name,
                ceo_name,
                company_phone_num,
                virtual_user_name = "",
            } = req.body;
            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let email = `${Math.random().toString(16).substring(2, 8)}@naver.com`
            let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand?.result[0];
            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }
            req.body.brand_id = brand?.id;
            if (
                !bank_code ||
                !account ||
                !name ||
                !birth ||
                !phone_num ||
                !user_type
            ) {
                return response(req, res, -100, "필수값을 입력해 주세요.", {});
            }
            if (birth?.length != 8) {
                return response(req, res, -100, "생년월일은 8자리 입니다.", {});
            }
            if (user_type > 0 && (
                !business_num ||
                !company_name ||
                !ceo_name ||
                !company_phone_num
            )) {
                return response(req, res, -100, "필수값을 입력해 주세요.", {});
            }
            let check_account = await corpApi.account.info({
                pay_type: 'withdraw',
                dns_data: brand,
                decode_user: { id: 0 },
                bank_code,
                acct_num: account,
                birth: birth,
                business_num: business_num,
                user_type: user_type,
            })
            if (check_account.code != 100) {
                return response(req, res, -110, (check_account?.message || "서버 에러 발생"), false)
            }
            if (name != check_account.data?.withdraw_acct_name) {
                return response(req, res, -100, "예금주명이 일치하지 않습니다.", false)
            }

            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                mcht = {
                    id: 0,
                }
            }
            await db.beginTransaction();
            let data = {
                tid: '',
            };
            let virtual_account_id = 0;
            let virtual_account = await pool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND birth=? AND deposit_acct_num=? AND is_delete=0`, [
                phone_num,
                birth,
                account,
            ])
            virtual_account = virtual_account?.result[0];

            if (virtual_account) {
                if (virtual_account?.status == 0) {
                    await db.rollback();
                    return response(req, res, -100, "이미 등록된 유저 입니다.", {})
                }
                virtual_account_id = virtual_account?.id;
            } else {
                if (user_type == 1 || user_type == 2) {
                    if (!business_num) {
                        await db.rollback();
                        return response(req, res, -100, "사업자등록번호는 필수입니다.", {})
                    }
                    if (!company_name) {
                        await db.rollback();
                        return response(req, res, -100, "회사명(상호)는 필수입니다.", {})
                    }
                    if (!ceo_name) {
                        await db.rollback();
                        return response(req, res, -100, "대표자명은 필수입니다.", {})
                    }
                    if (!company_phone_num) {
                        await db.rollback();
                        return response(req, res, -100, "회사 전화번호는 필수입니다.", {})
                    }

                }

                let insert_virtual_account = await insertQuery(`${table_name}`, {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    deposit_bank_code: bank_code,
                    deposit_acct_num: account,
                    deposit_acct_name: name,
                    phone_num: phone_num,
                    birth: birth,
                    email: email,
                    status: 5,
                    user_id: user_id,
                    user_type,
                    business_num,
                    company_name,
                    ceo_name,
                    company_phone_num,
                    guid: `${generateRandomString(20)}${new Date().getTime()}`,
                    virtual_user_name,
                });
                virtual_account_id = insert_virtual_account?.result?.insertId;
            }
            let api_result2 = await corpApi.user.account({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                deposit_bank_code: bank_code,
                deposit_acct_num: account,
                deposit_acct_name: name,
                birth: birth,
                phone_num: phone_num,
                business_num: business_num,
                user_type: user_type,
                virtual_bank_code: virtual_account?.virtual_bank_code,
                virtual_acct_num: virtual_account?.virtual_acct_num,
                virtual_issue_time: virtual_account?.virtual_issue_time,
            })
            if (api_result2?.code != 100) {
                await db.commit();
                return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), data)
            } else {
                data.tid = api_result2.data?.tid;
            }

            let update_virtual_account = await updateQuery(`${table_name}`, {
                deposit_tid: data.tid,
                virtual_bank_code: api_result2.data?.virtual_bank_code,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                virtual_acct_name: name,
                virtual_issue_time: api_result2.data?.virtual_issue_time,
                ci: api_result2.data?.ci,
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
    check: async (req_, res, next) => {// 1원인증 확인 및 발급
        let req = req_;
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                api_key,
                mid,
                tid,
                vrf_word,
                guid,
            } = req.body;

            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand?.result[0];
            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }
            req.body.brand_id = brand?.id;
            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                mcht = {
                    id: 0,
                }
            }

            let data = {};

            let virtual_account = await pool.query(`SELECT * FROM ${table_name} WHERE brand_id=? AND deposit_tid=? AND is_delete=0`, [
                brand?.id,
                tid,
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
                status: 0,
                tid: api_result?.data?.tid,
            }, virtual_account?.id)
            data.virtual_bank_code = virtual_account?.virtual_bank_code;
            data.virtual_acct_num = api_result?.data?.virtual_acct_num;
            data.virtual_acct_name = virtual_account?.virtual_acct_name;

            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default virtualAccountV3Ctrl;
