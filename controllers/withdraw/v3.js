'use strict';
import _ from "lodash";
import db, { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, getUserWithDrawFee, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, commarNumber, findBlackList, getDailyWithdrawAmount, getMotherDeposit, getOperatorList, getReqIp, isItemBrandIdSameDnsId, operatorLevelList, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
//코리아결제출금

export const makeSignValueSha256 = (text) => {
    let api_sign_val = crypto.createHash('sha256').update(text).digest('hex');
    return api_sign_val;
}
const withdrawV3Ctrl = {
    request: async (req_, res, next) => {
        let req = req_;
        try {
            let {
                api_key,
                mid,
                guid,
                withdraw_amount,
                pay_type = 'withdraw',
                note = "",
                api_sign_val,
                otp_num,
            } = req.body;
            withdraw_amount = parseInt(withdraw_amount);
            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            if (!mid) {
                return response(req, res, -100, "mid를 입력해주세요.", {});
            }
            let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            dns_data = dns_data?.result[0];
            dns_data['setting_obj'] = JSON.parse(dns_data?.setting_obj ?? '{}');
            req.body.brand_id = dns_data?.id;
            if (!dns_data) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }

            let pay_type_name = '';
            if (pay_type == 'withdraw') {
                pay_type_name = '출금';
                pay_type = 5;
            } else if (pay_type == 'return') {
                pay_type_name = '반환';
                pay_type = 20;
            } else {
                return response(req, res, -100, "결제타입에러", false)
            }

            let user_column = [
                `users.*`,
            ]
            let user = await pool.query(`SELECT ${user_column.join()} FROM users WHERE mid=? AND brand_id=${dns_data?.id} AND is_delete=0`, [
                mid
            ]);
            user = user?.result[0];
            if (user?.can_return != 1 && pay_type == 20) {
                return response(req, res, -100, "반환 권한이 없습니다.", false)
            }
            if (!user) {
                return response(req, res, -100, "mid가 잘못 되었습니다..", false)
            }

            let requestIp = getReqIp(req);
            if (requestIp != process.env.BACK_IP) {
                return response(req, res, -150, "ip 권한이 없습니다.", false)
            }
            /*
            let ip_list = await pool.query(`SELECT * FROM permit_ips WHERE user_id=${user?.id} AND is_delete=0`);
            ip_list = ip_list?.result;
            if (user?.level < 40 && (!ip_list.map(itm => { return itm?.ip }).includes(requestIp)) && ip_list.length > 0) {
                return response(req, res, -150, "ip 권한이 없습니다.", false)
            }
            */
            if (dns_data?.is_use_otp == 1) {
                var verified = speakeasy.totp.verify({
                    secret: user?.otp_token,
                    encoding: 'base32',
                    token: otp_num
                });
                if (!verified) {
                    return response(req, res, -100, "OTP번호가 잘못되었습니다.", false);
                }
            }
            if (dns_data?.is_use_sign_key == 1) {
                let user_api_sign_val = makeSignValueSha256(`${api_key}${mid}${user?.sign_key}`);
                if (user_api_sign_val != api_sign_val) {
                    return response(req, res, -100, "서명값이 잘못 되었습니다.", false)
                }
            }

            let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE guid=? AND is_delete=0 AND status=0`, [
                guid
            ]);
            virtual_account = virtual_account?.result[0];
            if (!virtual_account) {
                return response(req, res, -100, "가상계좌를 먼저 등록해 주세요.", false)
            }

            let amount = parseInt(withdraw_amount) + (dns_data?.withdraw_fee_type == 0 ? user?.withdraw_fee : 0);
            if (dns_data?.withdraw_max_price > 0) {
                let date = returnMoment().substring(0, 10);
                let today_withdraw_sum_sql = ` SELECT SUM(amount) AS amount, SUM(withdraw_fee) AS withdraw_fee FROM deposits WHERE brand_id=${dns_data?.id} `;
                today_withdraw_sum_sql += ` AND pay_type IN (5, 10, 20) `;
                today_withdraw_sum_sql += ` AND withdraw_status IN (0) `;
                today_withdraw_sum_sql += ` AND (created_at BETWEEN '${date} 00:00:00' AND '${date} 23:59:59')  `;
                let today_withdraw_sum = await pool.query(today_withdraw_sum_sql);
                today_withdraw_sum = (today_withdraw_sum?.result[0]?.amount ?? 0) * (-1) - (today_withdraw_sum?.result[0]?.withdraw_fee ?? 0);
                if (dns_data?.withdraw_max_price < today_withdraw_sum + amount) {
                    return response(req, res, -100, "출금 실패 B", false)
                }
            }
            if (dns_data?.month_withdraw_max_price > 0) {
                let first_date = returnMoment().substring(0, 10);
                let first_date_list = first_date.split('-');
                first_date = `${first_date_list[0]}-${first_date_list[1]}-01`;
                let month = parseInt(first_date_list[1]);
                let next_year = (month == 12 ? (parseInt(first_date_list[0]) + 1) : parseInt(first_date_list[0]));
                let next_month = (month == 12 ? 1 : (month + 1));

                let month_withdraw_sum_sql = ` SELECT SUM(amount) AS amount, SUM(withdraw_fee) AS withdraw_fee FROM deposits WHERE brand_id=${dns_data?.id} `;
                month_withdraw_sum_sql += ` AND pay_type IN (5, 10, 20) `;
                month_withdraw_sum_sql += ` AND withdraw_status IN (0) `;
                month_withdraw_sum_sql += ` AND (created_at BETWEEN '${first_date} 00:00:00' AND '${next_year}-${next_month >= 10 ? '' : '0'}${next_month}-01 00:00:00')  `;
                let month_withdraw_sum = await pool.query(month_withdraw_sum_sql);
                month_withdraw_sum = (month_withdraw_sum?.result[0]?.amount ?? 0) * (-1) - (month_withdraw_sum?.result[0]?.withdraw_fee ?? 0);
                if (dns_data?.month_withdraw_max_price < month_withdraw_sum + amount) {
                    return response(req, res, -100, "출금 실패 C", false)
                }
            }
            let return_time = returnMoment().substring(11, 16);
            if (dns_data?.setting_obj?.not_withdraw_s_time >= dns_data?.setting_obj?.not_withdraw_e_time) {
                if (return_time >= dns_data?.setting_obj?.not_withdraw_s_time || return_time <= dns_data?.setting_obj?.not_withdraw_e_time) {
                    return response(req, res, -100, `출금 불가 시간입니다. ${dns_data?.setting_obj?.not_withdraw_s_time} ~ ${dns_data?.setting_obj?.not_withdraw_e_time}`, false);
                }
            } else {
                if (return_time >= dns_data?.setting_obj?.not_withdraw_s_time && return_time <= dns_data?.setting_obj?.not_withdraw_e_time) {
                    return response(req, res, -100, `출금 불가 시간입니다. ${dns_data?.setting_obj?.not_withdraw_s_time} ~ ${dns_data?.setting_obj?.not_withdraw_e_time}`, false);
                }
            }
            let black_item = await findBlackList(virtual_account?.deposit_acct_num, 0, dns_data);
            if (black_item) {
                return response(req, res, -100, "블랙리스트 유저입니다.", false);
            }
            if (pay_type == 20 && user?.can_return_ago_pay == 1) {
                let deposit_count = await pool.query(`SELECT COUNT(*) AS count FROM deposits WHERE pay_type=0 AND virtual_account_id=${virtual_account?.id}`);
                deposit_count = deposit_count?.result[0];
                if (deposit_count?.count < 1) {
                    return response(req, res, -100, "결제한 이력이 없는 유저이므로 반환 불가합니다.", false)
                }
            }
            let deposit_obj = {
                brand_id: dns_data?.id,
                pay_type,
                expect_amount: (-1) * amount,
                settle_bank_code: virtual_account?.deposit_bank_code,
                settle_acct_num: virtual_account?.deposit_acct_num,
                settle_acct_name: virtual_account?.deposit_acct_name,
                withdraw_fee: user?.withdraw_fee,
                virtual_account_id: virtual_account?.id,
                user_id: user?.id,
                withdraw_status: 5,
                note: note,
                withdraw_fee_type: dns_data?.withdraw_fee_type,
            }
            let settle_amount_sql = ``;
            if (user?.level == 10) {
                settle_amount_sql = `SELECT SUM(mcht_amount) AS settle_amount FROM deposits WHERE mcht_id=${user?.id}`;
                deposit_obj[`mcht_id`] = user?.id
                deposit_obj[`mcht_amount`] = (-1) * amount;
            } else {
                let find_oper_level = _.find(operatorLevelList, { level: parseInt(user?.level) });
                settle_amount_sql = `SELECT SUM(sales${find_oper_level.num}_amount) AS settle_amount FROM deposits WHERE sales${find_oper_level.num}_id=${user?.id}`;
                deposit_obj[`sales${find_oper_level.num}_id`] = user?.id
                deposit_obj[`sales${find_oper_level.num}_amount`] = (-1) * amount;
            }
            let settle_amount = await pool.query(settle_amount_sql);
            settle_amount = settle_amount?.result[0]?.settle_amount ?? 0;
            if (dns_data?.default_withdraw_max_price < withdraw_amount) {
                return response(req, res, -100, `최대 ${pay_type_name}액은 ${commarNumber(dns_data?.default_withdraw_max_price)}원 입니다.`, false)
            }
            if (amount > settle_amount) {
                return response(req, res, -100, `${pay_type_name} 요청금이 보유정산금보다 많습니다.`, false)
            }
            if (settle_amount < user?.min_withdraw_remain_price) {
                return response(req, res, -100, `최소 ${pay_type_name}잔액은 ${commarNumber(user?.min_withdraw_remain_price)}원 입니다.`, false)
            }
            if (parseInt(withdraw_amount) < user?.min_withdraw_price) {
                return response(req, res, -100, `최소 ${pay_type_name}액은 ${commarNumber(user?.min_withdraw_price)}원 입니다.`, false)
            }
            if (settle_amount - amount < user?.min_withdraw_hold_price) {
                return response(req, res, -100, `최소 ${pay_type_name} 보류금액은 ${commarNumber(user?.min_withdraw_hold_price)}원 입니다.`, false)
            }
            if (user?.is_withdraw_hold == 1) {
                deposit_obj['is_withdraw_hold'] = 1;
            }

            let mother_account = await getMotherDeposit(dns_data);
            if (withdraw_amount > mother_account?.real_amount - mother_account?.hold_amount) {
                return response(req, res, -100, "출금 실패 A", false)
            }

            let check_account = await corpApi.account.info({
                pay_type: 'withdraw',
                dns_data: dns_data,
                decode_user: user,
                bank_code: virtual_account?.deposit_bank_code,
                acct_num: virtual_account?.deposit_acct_num,
                birth: virtual_account?.birth,
                business_num: virtual_account?.business_num,
                user_type: virtual_account?.user_type,
            })
            if (check_account.code != 100) {
                return response(req, res, -110, (check_account?.message || "서버 에러 발생"), false)
            }
            if (virtual_account?.deposit_acct_name.replaceAll(" ", "") != check_account.data?.withdraw_acct_name) {
                return response(req, res, -100, "예금주명이 일치하지 않습니다.", false)
            }
            let withdraw_id = 0;
            let result = await insertQuery(`deposits`, deposit_obj);
            withdraw_id = result?.result?.insertId;
            //인설트후 체크
            let settle_amount_2 = await pool.query(settle_amount_sql);
            settle_amount_2 = settle_amount_2?.result[0]?.settle_amount ?? 0;
            if (settle_amount_2 < 0) {
                let delete_result = await deleteQuery(`deposits`, { id: withdraw_id }, true);
                return response(req, res, -100, `${pay_type_name} 요청금이 보유정산금보다 많습니다.`, false)
            }
            //
            if (user?.is_withdraw_hold == 1) {
                return response(req, res, 100, "출금 요청이 완료되었습니다.", {});
            }

            let api_withdraw_request_result = await corpApi.withdraw.request({
                pay_type: 'withdraw',
                dns_data: dns_data,
                decode_user: user,
                guid: virtual_account?.guid,
                amount: withdraw_amount - (dns_data?.withdraw_fee_type == 0 ? 0 : user?.withdraw_fee),
                bank_code: virtual_account?.deposit_bank_code,
                acct_num: virtual_account?.deposit_acct_num,
                acct_name: virtual_account?.deposit_acct_name,
            })
            if (api_withdraw_request_result.code != 100) {
                return response(req, res, -120, (api_withdraw_request_result?.message || "서버 에러 발생"), false)
            }
            console.log(api_withdraw_request_result)
            let result3 = await updateQuery(`deposits`, {
                trx_id: api_withdraw_request_result.data?.tid,
                top_office_amount: api_withdraw_request_result.data?.top_amount,
            }, withdraw_id);

            /*
            let trx_id = `${new Date().getTime()}${decode_dns?.id}${user?.id}5`;
            let deposit_obj = {
                brand_id: decode_dns?.id,
                pay_type,
                amount: (-1) * (parseInt(withdraw_amount) + user?.withdraw_fee),
                settle_bank_code: user?.settle_bank_code,
                settle_acct_num: user?.settle_acct_num,
                settle_acct_name: user?.settle_acct_name,
                trx_id: trx_id,
                withdraw_fee: user?.withdraw_fee,
                user_id: user?.id,
            }
            */
            return response(req, res, 100, "success", {})
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default withdrawV3Ctrl;
