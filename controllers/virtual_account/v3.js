'use strict';
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, findBlackList, generateRandomString, getDnsData, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import logger from "../../utils.js/winston/index.js";
import { readPool } from "../../config/db-pool.js";
const table_name = 'virtual_accounts';
//코리아결제활용
const virtualAccountV3Ctrl = {
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
                let ing_virtual_account = await readPool.query(`SELECT id FROM ${table_name} WHERE phone_num=? AND status=5 AND brand_id=${brand?.id}`, [phone_num]);
                ing_virtual_account = ing_virtual_account[0][0];
                if (ing_virtual_account) {
                    return response(req, res, -100, "이미 진행중인 건이 존재합니다. 본사에 문의해 주세요.", {});
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
                name = "",
                birth,
                phone_num,
                user_id = 0,
                user_type = 0,
                business_num,
                company_name,
                ceo_name,
                company_phone_num,
                virtual_user_name = "",
                tid,
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
            let black_item = await findBlackList(account, 0, brand);
            if (black_item) {
                return response(req, res, -100, "블랙리스트 유저입니다.", {});
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
            if (name.replaceAll(" ", "") != check_account.data?.withdraw_acct_name) {
                return response(req, res, -100, "예금주명이 일치하지 않습니다.", false)
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

            let data = {
                tid: '',
                guid: '',
            };
            let virtual_account_id = 0;
            let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE phone_num=? AND birth=? AND deposit_acct_num=? AND is_delete=0 AND brand_id=${brand?.id}`, [
                phone_num,
                birth,
                account,
            ])
            virtual_account = virtual_account[0][0];

            if (virtual_account) {
                if (virtual_account?.status == 0) {
                    return response(req, res, -100, "이미 등록된 유저 입니다.", {})
                }
                virtual_account_id = virtual_account?.id;
                data.guid = virtual_account?.guid;
            } else {
                let guid = `${generateRandomString(20)}${new Date().getTime()}`;
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
                    guid,
                    virtual_user_name,
                });
                data.guid = guid;
                virtual_account_id = insert_virtual_account?.insertId;
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
                guid: data.guid,
                tid,
            })

            if (api_result2?.code != 100) {
                return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), data)
            } else {
                data.tid = api_result2.data?.tid;
            }

            let update_virtual_account = await updateQuery(`${table_name}`, {
                deposit_tid: data.tid,
                virtual_bank_code: api_result2.data?.virtual_bank_code,
                virtual_acct_num: api_result2.data?.virtual_acct_num,
                virtual_acct_name: brand?.virtual_front_nickname + name,
                virtual_issue_time: api_result2.data?.virtual_issue_time,
                ci: api_result2.data?.ci,
                deposit_bank_code: bank_code,
                deposit_acct_num: account,
                deposit_acct_name: name,
                phone_num: phone_num,
                birth: birth,
                guid: data.guid,
            }, virtual_account_id)

            return response(req, res, 100, "success", data)

        } catch (err) {
            console.log(err)
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
            let data = {};

            let virtual_account = await readPool.query(`SELECT * FROM ${table_name} WHERE brand_id=? AND deposit_tid=? AND is_delete=0`, [
                brand?.id,
                tid,
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
            data.ci = virtual_account?.ci;

            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default virtualAccountV3Ctrl;
