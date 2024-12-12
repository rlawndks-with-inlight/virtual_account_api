'use strict';
import db, { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, commarNumber, findBlackList, generateRandomString, getDnsData, insertResponseLog, isItemBrandIdSameDnsId, response, setDepositAmountSetting, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import logger from "../../utils.js/winston/index.js";
import crypto from 'crypto';
import { sendTelegramBot } from "../../utils.js/telegram/index.js";
import { emitSocket } from "../../utils.js/socket/index.js";
import { readPool } from "../../config/db-pool.js";

export const makeSignValueSha256 = (text) => {
    let api_sign_val = crypto.createHash('sha256').update(text).digest('hex');
    return api_sign_val;
}

//뱅크너스 활용 api
const giftCardV1Ctrl = {
    phone: {
        request: async (req_, res, next) => {//휴대폰인증
            let req = req_;
            try {
                let {
                    api_key,
                    mid,

                    name,
                    birth,
                    tel_com,
                    phone_num,
                    acct_back_one_num,

                    business_num = "",
                    company_name = "",
                    ceo_name = "",
                    company_phone_num = "",

                    user_type = 0,

                    type = '',
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
                if (brand?.setting_obj?.is_gift_card_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", false);
                }
                req.body.brand_id = brand?.id;
                if (
                    !name ||
                    !tel_com ||
                    !phone_num ||
                    !birth
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                if (birth?.length != 8) {
                    return response(req, res, -100, "생년월일은 8자리 입니다.", false);
                }
                if (user_type > 0 && (
                    !business_num ||
                    !company_name ||
                    !ceo_name ||
                    !company_phone_num ||
                    !acct_back_one_num
                )) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                if (!mid) {
                    return response(req, res, -100, "가맹점을 선택해 주세요.", false);
                }
                let mcht = await readPool.query(`SELECT * FROM users WHERE mid=? AND level=10 AND brand_id=${brand?.id}`, [mid]);
                mcht = mcht[0][0];
                if (!mcht) {
                    return response(req, res, -100, "정상적인 가맹점이 아닙니다.", false);
                }
                if ((mcht?.virtual_acct_link_status ?? 0) != 0) {
                    return response(req, res, -100, "상품권 발급 불가한 가맹점 입니다.", false)
                }
                let data = {
                    tid: '',
                };
                let member = await readPool.query(`SELECT id, ci, guid FROM members WHERE brand_id=${brand?.id} AND name=? AND phone_num=? AND birth=? AND is_delete=0`, [
                    name,
                    phone_num,
                    birth,
                ])
                member = member[0][0];
                if (member) {
                    if (member?.guid) {
                        return response(req, res, -100, "이미 등록된 회원입니다.", false)
                    }
                }
                /*
                let api_result = await corpApi.sms.push({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    name,
                    tel_com,
                    phone_num,
                    birth,
                    acct_back_one_num,
                    type: 'USER_CREATE',
                }); 
                */
                let email = `${Math.random().toString(16).substring(2, 8)}@naver.com`
                let ci = `ci${generateRandomString(40)}${new Date().getTime()}`;
                let di = `di${generateRandomString(40)}${new Date().getTime()}`;
                let user_obj = {
                    mcht_id: mcht?.id,
                    brand_id: brand?.id,
                    tel_com,
                    phone_num,
                    birth,
                    name,
                    acct_back_one_num,
                    user_type,
                    business_num,
                    company_name,
                    ceo_name,
                    company_phone_num,
                    email,
                    ci,
                    di,
                };
                let member_id = member?.id;
                if (member?.guid) {
                    let update_member = await updateQuery(`members`, user_obj, member_id);
                } else {
                    let insert_member = await insertQuery(`members`, user_obj);
                    member_id = insert_member?.insertId;
                }

                let api_result = await corpApi.user.create({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    ...user_obj,
                    email,
                });
                let update_member = await updateQuery(`members`, {
                    step: 1,
                    guid: api_result?.data?.guid,
                }, member_id);
                /*
                if (api_result?.code != 100) {
                    return response(req, res, -110, (api_result?.message || "서버 에러 발생"), false)
                }
                data.tid = api_result.data?.tid;
                let insert_auth_logs = await insertQuery(`phone_auth_histories`, {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    tid: api_result?.data?.tid,
                    phone_num: phone_num,
                    name: name,
                    amount: brand?.auth_fee ?? 0,
                })
                */
                return response(req, res, 100, "success", {
                    ci
                });
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req_, res, next) => {//발급요청
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    tid,
                    phone_vrf_word,
                    phone_num,
                    name,
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
                if (brand?.setting_obj?.is_gift_card_inspect == 1) {
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
                if ((mcht?.virtual_acct_link_status ?? 0) != 0) {
                    return response(req, res, -100, "상품권 발급 불가한 가맹점 입니다.", false)
                }
                let member = await readPool.query(`SELECT id, step, ci FROM members WHERE brand_id=${brand?.id} AND name=? AND phone_num=? AND is_delete=0`, [
                    name,
                    phone_num,
                ])
                member = member[0][0];
                if (!member) {
                    return response(req, res, -110, "휴대폰인증을 요청해 주세요.", false)
                }
                let api_result = await corpApi.sms.check({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    tid,
                    vrf_word: phone_vrf_word,
                });
                if (api_result?.code != 100) {
                    return response(req, res, -110, (api_result?.message || "서버 에러 발생"), false)
                }
                if (member?.ci) {
                    return response(req, res, 100, "success", member);
                }
                let update_member = await updateQuery(`members`, {
                    step: 1,
                    ci: api_result?.data?.ci,
                    di: api_result?.data?.di,
                }, member?.id);
                return response(req, res, 100, "success", {
                    ci: api_result?.data?.ci,
                });
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    },
    acct: {
        request: async (req_, res, next) => {//발급요청
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    ci,
                    deposit_bank_code,
                    deposit_acct_num,
                    name,
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
                if (brand?.setting_obj?.is_gift_card_inspect == 1) {
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
                if ((mcht?.virtual_acct_link_status ?? 0) != 0) {
                    return response(req, res, -100, "상품권 발급 불가한 가맹점 입니다.", false)
                }
                let black_item = await findBlackList(deposit_acct_num, 0, brand);
                if (black_item) {
                    return response(req, res, -100, "블랙리스트 유저입니다.", false);
                }
                let member = await readPool.query(`SELECT * FROM members WHERE brand_id=${brand?.id} AND ci=? AND is_delete=0`, [
                    ci,
                ])
                member = member[0][0];
                if (!member) {
                    return response(req, res, -110, "휴대폰인증을 완료해 주세요.", false)
                }
                let guid = member?.guid;
                if (!member?.guid) {
                    return response(req, res, -110, "회원 생성을 먼저 해주세요.", false)
                }
                let api_result2 = await corpApi.user.account({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    ...member,
                    guid: guid,
                    deposit_bank_code: deposit_bank_code,
                    deposit_acct_num: deposit_acct_num,
                    deposit_acct_name: name,
                })
                if (api_result2?.code != 100) {
                    return response(req, res, -120, (api_result2?.message || "서버 에러 발생"), false)
                }
                let update_virtual_account = await updateQuery(`members`, {
                    deposit_bank_code: deposit_bank_code,
                    deposit_acct_num: deposit_acct_num,
                    deposit_acct_name: name,
                }, member?.id)
                return response(req, res, 100, "success", {
                    tid: api_result2?.data?.tid,
                    guid: guid,
                })
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req_, res, next) => {//발급요청
            let req = req_;
            try {
                let {
                    api_key,
                    mid,
                    tid,
                    vrf_word,
                    guid,
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
                if (brand?.setting_obj?.is_gift_card_inspect == 1) {
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
                if ((mcht?.virtual_acct_link_status ?? 0) != 0) {
                    return response(req, res, -100, "상품권 발급 불가한 가맹점 입니다.", false)
                }
                let member = await readPool.query(`SELECT id FROM members WHERE brand_id=${brand?.id} AND guid=? AND is_delete=0`, [
                    guid,
                ])
                member = member[0][0];
                if (!member) {
                    return response(req, res, -110, "계좌 인증요청을 해주세요.", false)
                }
                let api_result = await corpApi.user.account_verify({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    tid,
                    vrf_word
                })
                if (api_result.code != 100) {
                    return response(req, res, -110, (api_result?.message || "서버 에러 발생"), false)
                }
                let update_member = await updateQuery(`members`, {
                    step: 2,
                }, member?.id);
                return response(req, res, 100, "success", {
                    tid: api_result?.data?.tid
                })
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    },
    gift: {
        order: async (req_, res, next) => {//발행요청
            let req = req_;
            try {
                let {
                    api_key,
                    guid,
                    gift_biz = 'PINPLENET',
                    gift_price,
                    gift_count,
                    is_agree_order,
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
                if (brand?.setting_obj?.is_gift_card_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", false);
                }
                req.body.brand_id = brand?.id;
                if (
                    !gift_biz ||
                    !gift_price ||
                    !gift_count ||
                    !is_agree_order
                ) {
                    return response(req, res, -100, "필수값을 입력해 주세요.", false);
                }
                let member = await readPool.query(`SELECT id FROM members WHERE brand_id=${brand?.id} AND guid=? AND is_delete=0`, [
                    guid,
                ])
                member = member[0][0];
                if (!member) {
                    return response(req, res, -110, "존재하지 않는 회원입니다.", false)
                }
                let insert_agree = await insertQuery(`gift_card_order_agrees`, {
                    brand_id: brand?.id,
                    member_id: member?.id,
                    is_agree_order,
                })

                let api_result = await corpApi.gift.order({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: member,
                    guid,
                    gift_biz,
                    gift_price: `GIFT_CD_${gift_price}`,
                    gift_count,
                })

                if (api_result.code != 100) {
                    return response(req, res, -110, (api_result?.message || "서버 에러 발생"), false)
                }
                return response(req, res, 100, "success", {})

            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        auth: async (req_, res, next) => {//사용인증
            let req = req_;
            try {
                let {
                    api_key,
                    guid,
                    gift_biz = 'PINPLENET',
                    gift_num,
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
                if (brand?.setting_obj?.is_gift_card_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", false);
                }
                req.body.brand_id = brand?.id;
                let member = await readPool.query(`SELECT id, name, phone_num, mcht_id FROM members WHERE brand_id=${brand?.id} AND guid=? AND is_delete=0`, [
                    guid,
                ])
                member = member[0][0];
                if (!member) {
                    return response(req, res, -110, "존재하지 않는 회원입니다.", false)
                }
                let api_result = await corpApi.gift.auth({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: member,
                    guid,
                    gift_biz,
                    gift_num,
                })
                if (api_result.code != 100) {
                    return response(req, res, -110, (api_result?.message || "서버 에러 발생"), false)
                }
                let mcht_columns = [
                    `users.*`,
                ]
                let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
                mcht_sql += ` WHERE users.id=${member?.mcht_id} `;
                let mcht = await readPool.query(mcht_sql);
                mcht = mcht[0][0];
                let insert_auth_logs = await insertQuery(`phone_auth_histories`, {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    tid: `gift${new Date().getTime()}`,
                    phone_num: member?.phone_num,
                    name: member?.name,
                    amount: brand?.auth_fee ?? 0,
                })
                return response(req, res, 100, "success", {})
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        use: async (req_, res, next) => {//사용처리
            let req = req_;
            try {
                let {
                    api_key,
                    guid,
                    gift_biz = 'PINPLENET',
                    gift_num,
                    vrf_word,
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
                if (brand?.setting_obj?.is_gift_card_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", false);
                }
                req.body.brand_id = brand?.id;
                let member = await readPool.query(`SELECT * FROM members WHERE brand_id=${brand?.id} AND guid=? AND is_delete=0`, [
                    guid,
                ])
                member = member[0][0];
                if (!member) {
                    return response(req, res, -110, "존재하지 않는 회원입니다.", false)
                }
                let api_result = await corpApi.gift.use({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: member,
                    guid,
                    gift_biz,
                    gift_num,
                    vrf_word,
                })
                if (api_result.code != 100) {
                    return response(req, res, -110, (api_result?.message || "서버 에러 발생"), false)
                }
                let mcht_columns = [
                    `users.*`,
                ]
                let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
                mcht_sql += ` WHERE users.id=${member?.mcht_id} `;
                let mcht = await readPool.query(mcht_sql);
                mcht = mcht[0][0];
                const {
                    tid,
                    amount,
                    member_balance,
                } = api_result?.data;
                let obj = {
                    brand_id: brand?.id,
                    mcht_id: mcht?.id,
                    member_id: member?.id,
                    amount,
                    expect_amount: amount,
                    pay_type: 0,
                    trx_id: tid,
                    gift_card_code: gift_num,
                };
                let deposit_setting = await setDepositAmountSetting(amount, mcht, brand);
                obj = {
                    ...obj,
                    ...deposit_setting,
                }
                let deposit_id = 0;
                let exist_deposit = await readPool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=?`, [
                    tid,
                    mcht?.brand_id
                ])
                exist_deposit = exist_deposit[0][0];
                if (exist_deposit) {
                    deposit_id = exist_deposit?.id;
                    let result = await updateQuery(`deposits`, obj, deposit_id);
                } else {
                    exist_deposit = {};
                    let result = await insertQuery(`deposits`, obj);
                    deposit_id = result?.insertId;
                }
                if (!(deposit_id > 0)) {
                    insertResponseLog(req, '9999');
                    return response(req, res, -100, "false", false)
                }
                if (exist_deposit?.is_move_mother == 1) {
                    insertResponseLog(req, '0000');
                    return response(req, res, 100, "success", {})
                }
                let mother_to_result = await corpApi.transfer.pass({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    from_guid: member?.guid,
                    to_guid: brand[`deposit_guid`],
                    amount: member_balance,
                })
                if (mother_to_result.code == 100) {
                    let obj = {
                        is_move_mother: 1,
                        move_mother_tid: mother_to_result.data?.tid,
                    }
                    obj[`deposit_noti_status`] = 5;
                    let noti_data = {
                        amount,
                        acct_name: member?.name,
                        created_at: returnMoment(),
                        tid: tid,
                    }
                    if (brand?.is_use_sign_key == 1) {
                        noti_data['api_sign_val'] = makeSignValueSha256(`${brand?.api_key}${mcht?.mid ?? ""}${mcht?.sign_key ?? ""}`)
                    }
                    obj[`deposit_noti_obj`] = JSON.stringify(noti_data);
                    let update_mother_to_result = await updateQuery('deposits', obj, deposit_id);
                }
                sendTelegramBot(brand, `${returnMoment()} ${brand?.name}\n${mcht?.nickname} ${member?.name} 님이 ${commarNumber(amount)}원을 입금하였습니다.`, JSON.parse(mcht?.telegram_chat_ids ?? '[]'));
                let bell_data = {
                    amount,
                    user_id: mcht?.id,
                    deposit_acct_name: member?.name,
                    nickname: mcht?.nickname,
                }
                emitSocket({
                    method: 'deposit',
                    brand_id: brand?.id,
                    data: bell_data
                })
                return response(req, res, 100, "success", {})
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    }

}
export default giftCardV1Ctrl