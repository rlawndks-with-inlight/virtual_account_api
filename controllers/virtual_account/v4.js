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
const virtualAccountV4Ctrl = {
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
                business_num,
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
            if (user_type == 0) {
                if (
                    !deposit_bank_code ||
                    !deposit_acct_num ||
                    !deposit_acct_name
                ) {
                    return response(req, res, -100, ADMIN_MSG + "필수값을 입력해 주세요.", false);
                }
                virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    phone_num,
                ])
                virtual_account = virtual_account[0][0];
                if (virtual_account?.status == 0) {
                    return response(req, res, -100, ADMIN_MSG + "이미 발급된 가상계좌가 존재합니다.", false)
                }
                if (brand?.deposit_process_type == 0) {
                    if (virtual_account?.phone_check != 1) {
                        return response(req, res, -100, ADMIN_MSG + "휴대폰인증을 완료해 주세요.", false)
                    }
                    if (virtual_account?.deposit_acct_check != 1) {
                        return response(req, res, -100, ADMIN_MSG + "계좌인증을 완료해 주세요.", false)
                    }
                    /*
                    let is_exist_account = await corpApi.account.info({
                        pay_type: 'deposit',
                        dns_data: brand,
                        ci: virtual_account?.ci,
                        bank_code: deposit_bank_code,
                        acct_num: deposit_acct_num,
                        name: virtual_account?.deposit_acct_name,
                    })
                    if (is_exist_account?.code != 100) {
                        return response(req, res, -100,ADMIN_MSG + (is_exist_account?.message || "서버 에러 발생"), false)
                    }
                    let update_virtual_account = await updateQuery(`${table_name}`, {
                        deposit_bank_code: deposit_bank_code,
                        deposit_acct_num: deposit_acct_num,
                    }, virtual_account?.id);  
                    */

                }


            } else if (user_type == 1 || user_type == 2) {
                if (
                    !deposit_bank_code ||
                    !deposit_acct_num
                ) {
                    return response(req, res, -100, ADMIN_MSG + "필수값을 입력해 주세요.", false);
                }
                virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE deposit_acct_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    deposit_acct_num,
                ])
                virtual_account = virtual_account[0][0];
            } else {
                return response(req, res, -100, ADMIN_MSG + "잘못된 유저타입 입니다.", false)
            }
            /*
            if (brand?.deposit_process_type == 0 && user_type == 0) {
                let update_virtual_account = await updateQuery(`${table_name}`, {
                    deposit_acct_check: 0,
                    deposit_bank_code,
                    deposit_acct_num,
                    deposit_acct_name,
                }, virtual_account?.id);
                let api_result = await corpApi.account.info({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    ci: virtual_account?.ci,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    name: deposit_acct_name,
                    user_type,
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100,ADMIN_MSG + (api_result?.message || "서버 에러 발생"), false)
                }
                let update_virtual_account2 = await updateQuery(`${table_name}`, {
                    deposit_acct_check: 1,
                }, virtual_account?.id);
            } 
            */

            let is_exist_account = await redisCtrl.addNumber(`vaccount_${virtual_account?.ci}`, 1, 10);
            if (is_exist_account > 1) {
                return response(req, res, -100, ADMIN_MSG + "아직 처리중인 건이 존재합니다.", false)
            }
            let api_result2 = await corpApi.vaccount({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                ci: virtual_account?.ci,
            })
            if (api_result2?.code != 100) {
                return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), false)
            }
            let update_virtual_account = await updateQuery(`${table_name}`, {
                virtual_bank_code: api_result2.data?.virtual_bank_code,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                guid: virtual_account?.ci,
                status: 0,
                mcht_id: mcht?.id,
                last_auth_date: returnMoment(),
                last_acct_auth_date: returnMoment(),
            }, virtual_account?.id);
            return response(req, res, 100, "success", {
                ci: virtual_account?.ci,
            })
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
    phone: {
        request: async (req_, res, next) => {//
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    birth,
                    name = "",
                    gender,
                    ntv_frnr,
                    tel_com,
                    phone_num,
                    user_type,
                    virtual_user_name = "",
                    is_certification,
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
                if (user_type != 0) {
                    return response(req, res, -100, ADMIN_MSG + "유저타입 에러", false)
                }
                if (
                    !birth ||
                    !name ||
                    !gender ||
                    !ntv_frnr ||
                    !tel_com ||
                    !phone_num
                ) {
                    return response(req, res, -100, ADMIN_MSG + "필수값을 입력해 주세요.", false);
                }
                let ci = `${brand?.id}${new Date().getTime()}` + phone_num + birth + mcht?.id;
                let virtual_account_id = 0;
                let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    phone_num,
                ])
                virtual_account = virtual_account[0][0];
                if (virtual_account?.status == 0) {
                    if (virtual_account?.mcht_id == mcht?.id) {
                        return response(req, res, -105, "이미 발급된 가상계좌가 존재합니다.", {
                            ci: virtual_account?.ci,
                        })
                    } else {
                        return response(req, res, -100, ADMIN_MSG + "타가맹점 발급건이 존재합니다.", false)
                    }
                }
                if (virtual_account) {
                    ci = virtual_account?.ci;
                }

                let obj = {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    phone_num: phone_num,
                    birth: birth,
                    status: 5,
                    user_type: user_type,
                    deposit_acct_name: name,
                    gender: gender,
                    ntv_frnr: ntv_frnr,
                    tel_com: tel_com,
                    phone_num: phone_num,
                    ci: ci,
                    virtual_user_name,
                    last_auth_request_date: returnMoment(),
                }

                let api_result = await corpApi.sms.push({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    ci: ci,
                    birth: birth,
                    name: name,
                    gender: gender,
                    ntv_frnr: ntv_frnr,
                    tel_com: tel_com,
                    phone_num: phone_num,
                    recert_yn: 'N',
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                let auth_history = await insertQuery('auth_histories', {
                    mcht_id: mcht?.id,
                    phone_num: phone_num,
                    brand_id: brand?.id,
                    auth_type: 0,
                });
                obj.phone_tid = api_result?.data?.tid;
                if (!virtual_account) {
                    let insert_virtual_account = await insertQuery(`${table_name}`, obj);
                } else {
                    let update_virtual_account = await updateQuery(`${table_name}`, obj, virtual_account?.id);
                }
                return response(req, res, 100, "success", api_result?.data)

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            }
        },
        check: async (req_, res, next) => {//
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    phone_num,
                    vrf_word,
                    tid,
                    birth,
                    name,
                    is_certification,
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
                if (
                    !phone_num ||
                    !vrf_word ||
                    !tid ||
                    !birth ||
                    !name
                ) {
                    return response(req, res, -100, ADMIN_MSG + "필수값을 입력해 주세요.", false);
                }
                let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND birth=? AND deposit_acct_name=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    phone_num,
                    birth,
                    name,
                ])
                virtual_account = virtual_account[0][0];
                if (virtual_account?.phone_check == 1) {
                    return response(req, res, -100, ADMIN_MSG + "이미 휴대폰 인증이 완료되었습니다.", false)
                }
                let api_result = await corpApi.sms.check({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    phone_num: phone_num,
                    ci: virtual_account?.ci,
                    vrf_word,
                    tid,
                    recert_yn: 'N',
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                let update_virtual_account = await updateQuery(`${table_name}`, {
                    phone_check: 1,
                    last_auth_date: returnMoment(),
                }, virtual_account?.id);
                return response(req, res, 100, "success", api_result?.data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            }
        },
    },
    acct: {
        request: async (req_, res, next) => {//
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    name,
                    deposit_bank_code,
                    deposit_acct_num,
                    deposit_acct_name,
                    user_type = 0,
                    virtual_user_name,
                    business_num,
                    phone_num,
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
                if (![0, 1, 2].includes(parseInt(user_type)) && brand?.deposit_process_type == 0) {
                    return response(req, res, -100, ADMIN_MSG + "유저타입 에러", false)
                }
                if (
                    !name ||
                    !deposit_bank_code ||
                    !deposit_acct_num
                ) {
                    return response(req, res, -100, ADMIN_MSG + "필수값을 입력해 주세요.", false);
                }
                let ci = `${brand?.id}${new Date().getTime()}` + deposit_bank_code + deposit_acct_num;
                let virtual_account = undefined;
                if (user_type == 0) {
                    virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                        phone_num,
                    ])
                    virtual_account = virtual_account[0][0];
                } else {
                    virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE deposit_bank_code=? AND deposit_acct_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                        deposit_bank_code,
                        deposit_acct_num,
                    ])
                    virtual_account = virtual_account[0][0];
                }
                if (virtual_account?.status == 0) {
                    return response(req, res, -100, ADMIN_MSG + "이미 발급된 가상계좌가 존재합니다.", false)
                } else {
                    if (brand?.deposit_process_type == 1) {//무기명 타입일때

                    }
                }
                if (virtual_account) {
                    ci = virtual_account?.ci;
                }
                let is_exist_account = await corpApi.account.info({
                    pay_type: 'deposit',
                    dns_data: brand,
                    ci: ci,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    name: name,
                    business_num,
                    user_type,
                    recert_yn: 'N',
                })
                if (is_exist_account?.code != 100) {
                    return response(req, res, -100, (is_exist_account?.message || "서버 에러 발생"), false)
                }
                let obj = {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    status: 5,
                    user_type: user_type,
                    deposit_acct_name: name,
                    deposit_bank_code: deposit_bank_code,
                    deposit_acct_num: deposit_acct_num,
                    ci: ci,
                    virtual_user_name,
                    business_num,
                    last_acct_auth_request_date: returnMoment(),
                }

                let api_result = await corpApi.user.account({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    ci: ci,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    name: name,
                    business_num,
                    user_type,
                    recert_yn: 'N',
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                let auth_history = await insertQuery('auth_histories', {
                    mcht_id: mcht?.id,
                    acct_num: deposit_acct_num,
                    brand_id: brand?.id,
                    auth_type: 1,
                });
                obj.deposit_acct_tid = api_result?.data?.tid;
                if (!virtual_account) {
                    let insert_virtual_account = await insertQuery(`${table_name}`, obj);
                } else {
                    let update_virtual_account = await updateQuery(`${table_name}`, obj, virtual_account?.id);
                }
                return response(req, res, 100, "success", api_result?.data)

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            }
        },
        check: async (req_, res, next) => {//
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    vrf_word,
                    tid,
                    deposit_bank_code,
                    deposit_acct_num,
                    date,
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
                if (
                    !vrf_word ||
                    !tid ||
                    !deposit_bank_code ||
                    !deposit_acct_num
                ) {
                    return response(req, res, -100, ADMIN_MSG + "필수값을 입력해 주세요.", false);
                }
                let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE deposit_acct_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    deposit_acct_num,
                ])
                virtual_account = virtual_account[0][0];
                if (!virtual_account) {
                    return response(req, res, -100, ADMIN_MSG + "1원인증요청을 먼저 진행해 주세요.", false)
                }
                let api_result = await corpApi.user.account_verify({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    ci: virtual_account?.ci,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    tid: tid,
                    vrf_word: vrf_word,
                    recert_yn: 'N',
                    date,
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                let update_virtual_account = await updateQuery(`${table_name}`, {
                    deposit_acct_check: 1,
                    last_acct_auth_date: returnMoment(),
                }, virtual_account?.id);
                return response(req, res, 100, "success", api_result?.data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            }
        },
        name: async (req_, res, next) => {//
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    name,
                    deposit_bank_code,
                    deposit_acct_num,
                    user_type,
                    virtual_user_name,
                    phone_num,
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

                if (
                    !name ||
                    !deposit_bank_code ||
                    !deposit_acct_num
                ) {
                    return response(req, res, -100, ADMIN_MSG + "필수값을 입력해 주세요.", false);
                }
                let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    phone_num,
                ])
                virtual_account = virtual_account[0][0];
                if (virtual_account?.status == 0) {
                    return response(req, res, -100, ADMIN_MSG + "이미 발급된 가상계좌가 존재합니다.", false)
                } else {
                    if (brand?.deposit_process_type == 1) {//무기명 타입일때

                    }
                }
                let api_result = await corpApi.user.account({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    ci: virtual_account?.ci,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    name: name,
                })
                let update_virtual_account = await updateQuery(`${table_name}`, {
                    deposit_acct_check: 1,
                    deposit_bank_code,
                    deposit_acct_num,
                    deposit_acct_name: name,
                }, virtual_account?.id);
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                return response(req, res, 100, "success", api_result?.data)

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            }
        },
    }
};

export default virtualAccountV4Ctrl;
