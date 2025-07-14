'use strict';
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, findBlackList, generateRandomString, getDnsData, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import logger from "../../utils.js/winston/index.js";
import { readPool, writePool } from "../../config/db-pool.js";
import redisCtrl from "../../redis/index.js";
const table_name = 'virtual_accounts';
//icb
const ADMIN_MSG = '관리자 메세지: '
const virtualAccountV5Ctrl = {
    nice: async (req_, res, next) => {// 발급
        let req = req_;
        try {
            let {
                api_key,
                mid,

            } = req.body;
            if (!api_key) {
                return response(req, res, -100, ADMIN_MSG + "api key를 입력해주세요.", false);
            }

            let brand = await redisCtrl.get(`dns_data_${api_key}`);
            if (brand) {
                brand = JSON.parse(brand ?? "{}");
            } else {
                brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand[0][0] ?? {};
                await redisCtrl.set(`dns_data_${api_key}`, JSON.stringify(brand), 60);
            }

            if (!brand?.id) {
                return response(req, res, -100, ADMIN_MSG + "api key가 잘못되었습니다.", {});
            }
            brand = await getDnsData(brand, true);
            brand = await getDnsData(brand);
            if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                return response(req, res, -100, ADMIN_MSG + "점검중입니다. 본사에게 문의하세요", false);
            }
            req.body.brand_id = brand?.id;
            if (!mid) {
                return response(req, res, -100, ADMIN_MSG + "가맹점을 선택해 주세요.", false);
            }
            let mcht = await redisCtrl.get(`mcht_${mid}_${brand?.id}`);
            if (mcht) {
                mcht = JSON.parse(mcht ?? '{}');
            } else {
                mcht = await writePool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
                mcht = mcht[0][0] ?? {};
                await redisCtrl.set(`mcht_${mid}_${brand?.id}`, JSON.stringify(mcht), 60);
            }
            if (!mcht?.id) {
                return response(req, res, -100, ADMIN_MSG + "정상적인 가맹점이 아닙니다.", {});
            }
            if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                return response(req, res, -100, ADMIN_MSG + "가상계좌 발급 불가한 가맹점 입니다.", false)
            }
            return response(req, res, 100, "success", {
                url: `https://www.acc-search.com/vact/nice/ex/${mcht?.auth_user_name}`,
            })
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
    issuance: async (req_, res, next) => {// 발급
        let req = req_;
        try {
            let {
                api_key,
                mid,
                user_type,
                deposit_acct_name,
                deposit_bank_code,
                deposit_acct_num,
                phone_num,
                birth,
                gender
            } = req.body;
            if (!api_key) {
                return response(req, res, -100, ADMIN_MSG + "api key를 입력해주세요.", false);
            }

            let brand = await redisCtrl.get(`dns_data_${api_key}`);
            if (brand) {
                brand = JSON.parse(brand ?? "{}");
            } else {
                brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand[0][0] ?? {};
                await redisCtrl.set(`dns_data_${api_key}`, JSON.stringify(brand), 60);
            }

            if (!brand?.id) {
                return response(req, res, -100, ADMIN_MSG + "api key가 잘못되었습니다.", {});
            }
            brand = await getDnsData(brand, true);
            brand = await getDnsData(brand);
            if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                return response(req, res, -100, ADMIN_MSG + "점검중입니다. 본사에게 문의하세요", false);
            }
            req.body.brand_id = brand?.id;
            if (!mid) {
                return response(req, res, -100, ADMIN_MSG + "가맹점을 선택해 주세요.", false);
            }
            let mcht = await redisCtrl.get(`mcht_${mid}_${brand?.id}`);
            if (mcht) {
                mcht = JSON.parse(mcht ?? '{}');
            } else {
                mcht = await writePool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
                mcht = mcht[0][0] ?? {};
                await redisCtrl.set(`mcht_${mid}_${brand?.id}`, JSON.stringify(mcht), 60);
            }
            if (!mcht?.id) {
                return response(req, res, -100, ADMIN_MSG + "정상적인 가맹점이 아닙니다.", {});
            }
            if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                return response(req, res, -100, ADMIN_MSG + "가상계좌 발급 불가한 가맹점 입니다.", false)
            }
            let black_item = await findBlackList(deposit_acct_num, 0, brand);
            if (black_item) {
                return response(req, res, -100, ADMIN_MSG + "블랙리스트 유저입니다.", false);
            }
            let virtual_account = {};

            virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE deposit_acct_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                deposit_acct_num,
            ])
            virtual_account = virtual_account[0][0];
            if (virtual_account?.status == 0) {
                return response(req, res, -100, ADMIN_MSG + "이미 발급된 건이 존재합니다.", false);
            }
            let is_exist_account = await redisCtrl.addNumber(`vaccount_${virtual_account?.ci}`, 1, 10);
            if (is_exist_account > 1) {
                return response(req, res, -100, ADMIN_MSG + "아직 처리중인 건이 존재합니다.", false)
            }

            let ci = `${brand?.id}${new Date().getTime()}` + phone_num + birth + mcht?.id;
            birth = birth.substring(2, 8);
            let result = await insertQuery(table_name, {
                brand_id: brand?.id,
                mcht_id: mcht?.id,
                phone_num: phone_num,
                birth: birth,
                status: 5,
                deposit_bank_code: deposit_bank_code,
                deposit_acct_num: deposit_acct_num,
                deposit_acct_name: deposit_acct_name,
                gender: gender,
                phone_num: phone_num,
                ci: ci,
            })
            let virtual_account_id = result?.insertId;
            let api_result2 = await corpApi.vaccount({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                bank_code: deposit_bank_code,
                acct_num: deposit_acct_num,
                acct_name: deposit_acct_name,
                phone_num: phone_num,
                birth: birth,
                gender: gender,
                auth_user_name: mcht?.auth_user_name,
            })
            if (api_result2?.code != 100) {
                return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), false)
            }
            let update_virtual_account = await updateQuery(`${table_name}`, {
                virtual_bank_code: api_result2.data?.virtual_bank_code,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                guid: ci,
                status: 0,
            }, virtual_account_id);
            return response(req, res, 100, "success", {
                ci: ci,
            })
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default virtualAccountV5Ctrl;
