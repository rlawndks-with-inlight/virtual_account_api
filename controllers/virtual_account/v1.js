'use strict';
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, findBlackList, getDnsData, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import logger from "../../utils.js/winston/index.js";
import crypto from 'crypto';
import { readPool } from "../../config/db-pool.js";
const table_name = 'virtual_accounts';

export const makeSignValueSha256 = (text) => {
    let api_sign_val = crypto.createHash('sha256').update(text).digest('hex');
    return api_sign_val;
}

//뱅크너스 활용 api
const virtualAccountV1Ctrl = {
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
                api_sign_val,
            } = req.body;
            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let email = `${Math.random().toString(16).substring(2, 8)}@naver.com`
            let brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand[0][0];
            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }
            brand = await getDnsData(brand);
            if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
            }
            req.body.brand_id = brand?.id;
            if (
                !bank_code ||
                !account ||
                !name ||
                !birth ||
                !phone_num ||
                (!user_type && user_type != 0)
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
            if (!mid) {
                return response(req, res, -100, "가맹점을 선택해 주세요.", {});
            }
            let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
            mcht = mcht[0][0];
            if (!mcht) {
                return response(req, res, -100, "정상적인 가맹점이 아닙니다.", {});
            }
            if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                return response(req, res, -100, "가상계좌 발급 불가한 가맹점 입니다.", false)
            }
            if (brand?.is_use_sign_key == 1) {
                let user_api_sign_val = makeSignValueSha256(`${api_key}${mid}${mcht?.sign_key ?? ""}`);
                if (user_api_sign_val != api_sign_val) {
                    return response(req, res, -100, "서명값이 잘못 되었습니다.", false)
                }
            }
            let black_item = await findBlackList(account, 0, brand);
            if (black_item) {
                return response(req, res, -100, "블랙리스트 유저입니다.", {});
            }
            let data = {
                guid: '',
                tid: '',
            };
            let virtual_account_id = 0;
            let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND birth=? AND mcht_id=? AND is_delete=0`, [
                phone_num,
                birth,
                mcht?.id,
            ])
            virtual_account = virtual_account[0][0];

            if (virtual_account) {
                virtual_account_id = virtual_account?.id;
                data.guid = virtual_account?.guid;
            } else {
                let create_user_obj = {
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    email,
                    name: name,
                    phone_num: phone_num,
                    birth: birth,
                    user_type,
                }
                if (user_type == 1 || user_type == 2) {
                    if (!business_num) {
                        return response(req, res, -100, "사업자등록번호는 필수입니다.", {})
                    }
                    if (!company_name) {
                        return response(req, res, -100, "회사명(상호)는 필수입니다.", {})
                    }
                    if (!ceo_name) {
                        return response(req, res, -100, "대표자명은 필수입니다.", {})
                    }
                    if (!company_phone_num) {
                        return response(req, res, -100, "회사 전화번호는 필수입니다.", {})
                    }
                    create_user_obj = {
                        ...create_user_obj,
                        business_num,
                        company_name,
                        ceo_name,
                        company_phone_num,
                    }
                }

                let api_result = await corpApi.user.create(create_user_obj);

                if (api_result?.code != 100) {
                    return response(req, res, -110, (api_result?.message || "서버 에러 발생"), data)
                }

                let insert_virtual_account = await insertQuery(`${table_name}`, {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    deposit_acct_name: name,
                    phone_num: phone_num,
                    birth: birth,
                    email: email,
                    status: 5,
                    guid: api_result.data?.guid,
                    ci: api_result.data?.ci,
                    user_id: user_id,
                    user_type,
                    business_num,
                    company_name,
                    ceo_name,
                    company_phone_num,
                });
                virtual_account_id = insert_virtual_account?.insertId;
                data.guid = api_result.data?.guid;
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
                business_num: business_num,
                user_type: user_type,
            })

            if (api_result2?.code != 100) {
                return response(req, res, -120, (api_result2?.message || "서버 에러 발생"), data)
            } else {
                data.tid = api_result2.data?.tid;
            }
            let update_virtual_account = await updateQuery(`${table_name}`, {
                deposit_bank_code: bank_code,
                deposit_acct_num: account,
                deposit_acct_name: name,
                deposit_tid: data.tid,
            }, virtual_account_id)

            return response(req, res, 100, "success", data)

        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
    check: async (req_, res, next) => {// 1원인증
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
                api_sign_val,
            } = req.body;

            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand[0][0];
            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }
            brand = await getDnsData(brand);
            if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
            }

            req.body.brand_id = brand?.id;
            if (!mid) {
                return response(req, res, -100, "가맹점을 선택해 주세요.", {});
            }
            let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
            mcht = mcht[0][0];
            if (!mcht) {
                return response(req, res, -100, "정상적인 가맹점이 아닙니다.", {});
            }
            if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                return response(req, res, -100, "가상계좌 발급 불가한 가맹점 입니다.", false)
            }
            if (brand?.is_use_sign_key == 1) {
                let user_api_sign_val = makeSignValueSha256(`${api_key}${mid}${mcht?.sign_key ?? ""}`);
                if (user_api_sign_val != api_sign_val) {
                    return response(req, res, -100, "서명값이 잘못 되었습니다.", false)
                }
            }

            let data = {};

            let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE brand_id=? AND guid=? AND is_delete=0`, [
                brand?.id,
                guid,
            ]);
            virtual_account = virtual_account[0][0];
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
                return response(req, res, -110, (api_result?.message || "서버 에러 발생"), data)
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
                api_key,
                mid,
                guid,
                api_sign_val,
            } = req.body;
            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand[0][0];

            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }
            brand = await getDnsData(brand);
            if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
            }

            let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
            mcht = mcht[0][0];
            if (!mcht) {
                mcht = {
                    id: 0,
                }
            }
            if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                return response(req, res, -100, "가상계좌 발급 불가한 가맹점 입니다.", false)
            }
            if (brand?.is_use_sign_key == 1) {
                let user_api_sign_val = makeSignValueSha256(`${api_key}${mid}${mcht?.sign_key ?? ""}`);
                if (user_api_sign_val != api_sign_val) {
                    return response(req, res, -100, "서명값이 잘못 되었습니다.", false)
                }
            }
            let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE brand_id=? AND guid=? AND is_delete=0`, [
                brand?.id,
                guid,
            ]);
            virtual_account = virtual_account[0][0];
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
                return response(req, res, -110, (api_result2?.message || "서버 에러 발생"), data)
            }
            data = {
                bank_id: api_result2.data?.bank_id,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                virtual_acct_name: api_result2.data?.virtual_acct_name,
                tid: api_result2.data?.tid,
                ci: virtual_account?.ci,
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
    phone: {
        request: async (req_, res, next) => {//발급요청
            let req = req_;
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                let {
                    api_key,
                    mid,
                    tel_com,
                    phone_num,
                    birth,
                    name,
                    gender,
                    ntv_frnr,
                    acct_back_one_num,
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let email = `${Math.random().toString(16).substring(2, 8)}@naver.com`
                let brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand[0][0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
                }
                req.body.brand_id = brand?.id;

                if (!mid) {
                    return response(req, res, -100, "가맹점을 선택해 주세요.", {});
                }
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "정상적인 가맹점이 아닙니다.", {});
                }
                if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                    return response(req, res, -100, "가상계좌 발급 불가한 가맹점 입니다.", false)
                }
                let phone_request = await corpApi.sms.push({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    birth: birth,
                    name: name,
                    gender: gender,
                    ntv_frnr: ntv_frnr,
                    tel_com: tel_com,
                    phone_num: phone_num,
                    acct_back_one_num: acct_back_one_num,
                })
                if (phone_request.code != 100) {
                    return response(req, res, -110, (phone_request?.message || "서버 에러 발생"), false)
                }
                return response(req, res, 100, "success", phone_request?.data)

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", {})
            } finally {

            }
        },
        check: async (req_, res, next) => {//발급요청
            let req = req_;
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                let {
                    api_key,
                    mid,
                    tid,
                    auth_id,
                    vrf_word,
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand[0][0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
                }
                req.body.brand_id = brand?.id;

                if (!mid) {
                    return response(req, res, -100, "가맹점을 선택해 주세요.", {});
                }
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "정상적인 가맹점이 아닙니다.", {});
                }
                if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                    return response(req, res, -100, "가상계좌 발급 불가한 가맹점 입니다.", false)
                }
                let phone_check = await corpApi.sms.check({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    vrf_word,
                    tid,
                    auth_id,
                })
                if (phone_check.code != 100) {
                    return response(req, res, -110, (phone_check?.message || "서버 에러 발생"), false)
                }
                return response(req, res, 100, "success", {
                    tid,
                })

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", {})
            } finally {

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
                    user_type,
                    virtual_user_name,
                    tid,
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", false);
                }
                let brand = await readPool.query(`SELECT id FROM brands WHERE api_key=?`, [api_key]);
                brand = brand[0][0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", false);
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", false);
                }
                req.body.brand_id = brand?.id;
                if (!mid) {
                    return response(req, res, -100, "가맹점을 선택해 주세요.", false);
                }
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "정상적인 가맹점이 아닙니다.", false);
                }
                if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                    return response(req, res, -100, "가상계좌 발급 불가한 가맹점 입니다.", false)
                }
                if (![1, 2].includes(parseInt(user_type)) && brand?.deposit_process_type == 0) {
                    return response(req, res, -100, "유저타입 에러", false)
                }

                if (
                    !name ||
                    !deposit_bank_code ||
                    !deposit_acct_num
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                let ci = `${brand?.id}${new Date().getTime()}` + deposit_bank_code + deposit_acct_num;
                let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE deposit_bank_code=? AND deposit_acct_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    deposit_bank_code,
                    deposit_acct_num,
                ])
                virtual_account = virtual_account[0][0];
                if (virtual_account?.status == 0) {
                    return response(req, res, -100, "이미 발급된 가상계좌가 존재합니다.", false)
                } else {
                    if (brand?.deposit_process_type == 1) {//무기명 타입일때

                    }
                }
                /*
                if (!virtual_account) {
                    let is_exist_account = await corpApi.account.info({
                        pay_type: 'deposit',
                        dns_data: brand,
                        ci: ci,
                        bank_code: deposit_bank_code,
                        acct_num: deposit_acct_num,
                        name: name,
                    })
                    if (is_exist_account?.code != 100) {
                        return response(req, res, -100, (is_exist_account?.message || "서버 에러 발생"), false)
                    }
                }
                */
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
                }
                if (!virtual_account) {
                    let insert_virtual_account = await insertQuery(`${table_name}`, obj);
                } else {
                    ci = virtual_account?.ci;
                    let update_virtual_account = await updateQuery(`${table_name}`, obj, virtual_account?.id);
                }

                let api_result = await corpApi.user.account({
                    dns_data: brand,
                    pay_type: 'deposit',
                    decode_user: mcht,
                    ci: ci,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    name: name,
                    tid,
                })
                console.log(api_result)
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
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
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", false);
                }
                let brand = await readPool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand[0][0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", false);
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", false);
                }
                req.body.brand_id = brand?.id;
                if (!mid) {
                    return response(req, res, -100, "가맹점을 선택해 주세요.", false);
                }
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "정상적인 가맹점이 아닙니다.", false);
                }
                if ((mcht?.virtual_acct_link_status ?? 0) != 0 || mcht?.is_delete == 1) {
                    return response(req, res, -100, "가상계좌 발급 불가한 가맹점 입니다.", false)
                }
                if (
                    !vrf_word ||
                    !tid ||
                    !deposit_bank_code ||
                    !deposit_acct_num
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE deposit_bank_code=? AND deposit_acct_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                    deposit_bank_code,
                    deposit_acct_num,
                ])
                virtual_account = virtual_account[0][0];
                if (!virtual_account) {
                    return response(req, res, -100, "1원인증요청을 먼저 진행해 주세요.", false)
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
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
                }
                let update_virtual_account = await updateQuery(`${table_name}`, {
                    deposit_acct_check: 1,
                }, virtual_account?.id);
                return response(req, res, 100, "success", api_result?.data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            }
        },
    }
};

export default virtualAccountV1Ctrl;
