'use strict';
import db, { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, getUserWithDrawFee, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, commarNumber, getDailyWithdrawAmount, getOperatorList, getReqIp, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';
import speakeasy from 'speakeasy';
const table_name = 'virtual_accounts';
//쿠콘활용api
const withdrawV3Ctrl = {
    check: async (req, res, next) => {
        try {
            let {
                api_key,
                mid,
                withdraw_bank_code,
                withdraw_acct_num,
            } = req.body;

            let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            dns_data = dns_data?.result[0];
            let operator_list = getOperatorList(dns_data);
            let mcht_sql = `SELECT ${process.env.SELECT_COLUMN_SECRET} FROM users `;
            mcht_sql += ` LEFT JOIN merchandise_columns ON merchandise_columns.mcht_id=users.id `;
            mcht_sql += ` LEFT JOIN virtual_accounts ON users.virtual_account_id=virtual_accounts.id `;
            let mcht_columns = [
                `users.*`,
                `merchandise_columns.mcht_fee`,
            ]
            for (var i = 0; i < operator_list.length; i++) {
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_id`);
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_fee`);
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_withdraw_fee`);
                mcht_columns.push(`sales${operator_list[i]?.num}.user_name AS sales${operator_list[i]?.num}_user_name`);
                mcht_columns.push(`sales${operator_list[i]?.num}.nickname AS sales${operator_list[i]?.num}_nickname`);
                mcht_sql += ` LEFT JOIN users AS sales${operator_list[i]?.num} ON sales${operator_list[i]?.num}.id=merchandise_columns.sales${operator_list[i]?.num}_id `;
            }
            mcht_sql += ` WHERE users.mid=? AND users.brand_id=? `;
            mcht_sql = mcht_sql.replace(process.env.SELECT_COLUMN_SECRET, mcht_columns.join())
            let user = await pool.query(mcht_sql, [mid, dns_data?.id]);
            user = user?.result[0];

            let requestIp = getReqIp(req);
            let ip_list = await pool.query(`SELECT * FROM permit_ips WHERE user_id=${user?.id} AND is_delete=0`);
            ip_list = ip_list?.result;
            if (user?.level < 40 && (!ip_list.map(itm => { return itm?.ip }).includes(requestIp)) && ip_list.length > 0) {
                return response(req, res, -150, "ip 권한이 없습니다.", {})
            }


            let account_info = await corpApi.account.info({
                pay_type: 'withdraw',
                dns_data: dns_data,
                decode_user: user,
                bank_code: withdraw_bank_code,
                acct_num: withdraw_acct_num,
            })
            if (account_info.code == 100) {
                return response(req, res, 100, "success", account_info.data)
            } else {
                return response(req, res, -100, (account_info?.message || "서버 에러 발생"), false)
            }

        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
    request: async (req, res, next) => {//출금요청
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            let {
                api_key,
                mid,
                withdraw_amount,
                note,
                withdraw_bank_code,
                withdraw_acct_num,
                withdraw_acct_name,
                pay_type = 'withdraw',
                otp_num,
                deposit_acct_name = "",
            } = req.body;
            if (!(withdraw_amount > 0)) {
                return response(req, res, -100, "금액을 0원 이상 입력해주세요.", false);
            }
            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", false);
            }
            let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            dns_data = dns_data?.result[0];
            let operator_list = getOperatorList(dns_data);
            if (!dns_data) {
                return response(req, res, -100, "api key가 잘못되었습니다.", false);
            }
            dns_data['setting_obj'] = JSON.parse(dns_data?.setting_obj ?? '{}');

            let mcht_sql = `SELECT ${process.env.SELECT_COLUMN_SECRET} FROM users `;
            mcht_sql += ` LEFT JOIN merchandise_columns ON merchandise_columns.mcht_id=users.id `;
            mcht_sql += ` LEFT JOIN virtual_accounts ON users.virtual_account_id=virtual_accounts.id `;
            let mcht_columns = [
                `users.*`,
                `merchandise_columns.mcht_fee`,
            ]
            for (var i = 0; i < operator_list.length; i++) {
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_id`);
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_fee`);
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_withdraw_fee`);
                mcht_columns.push(`sales${operator_list[i]?.num}.user_name AS sales${operator_list[i]?.num}_user_name`);
                mcht_columns.push(`sales${operator_list[i]?.num}.nickname AS sales${operator_list[i]?.num}_nickname`);
                mcht_sql += ` LEFT JOIN users AS sales${operator_list[i]?.num} ON sales${operator_list[i]?.num}.id=merchandise_columns.sales${operator_list[i]?.num}_id `;
            }
            mcht_sql += ` WHERE users.mid=? AND users.brand_id=? `;
            mcht_sql = mcht_sql.replace(process.env.SELECT_COLUMN_SECRET, mcht_columns.join())
            let user = await pool.query(mcht_sql, [mid, dns_data?.id]);
            user = user?.result[0];

            let requestIp = getReqIp(req);
            let ip_list = await pool.query(`SELECT * FROM permit_ips WHERE user_id=${user?.id} AND is_delete=0`);
            ip_list = ip_list?.result;
            if (user?.level < 40 && (!ip_list.map(itm => { return itm?.ip }).includes(requestIp)) && ip_list.length > 0) {
                return response(req, res, -150, "ip 권한이 없습니다.", {})
            }

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
            if (!withdraw_bank_code) {
                return response(req, res, -100, "은행을 선택해 주세요.", false)
            }
            if (!withdraw_acct_num) {
                return response(req, res, -100, "계좌번호를 입력해 주세요.", false)
            }
            if (!withdraw_acct_name) {
                return response(req, res, -100, "예금주명을 입력해 주세요.", false)
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
            // 여기부터 출금로직
            withdraw_amount = parseInt(withdraw_amount);

            let amount = parseInt(withdraw_amount) + (dns_data?.withdraw_fee_type == 0 ? user?.withdraw_fee : 0);
            if (user?.level == 10 && dns_data?.setting_obj?.is_use_daily_withdraw == 1) {
                let daliy_withdraw_amount = await getDailyWithdrawAmount(user);
                daliy_withdraw_amount = (daliy_withdraw_amount?.withdraw_amount ?? 0) * (-1);
                if (daliy_withdraw_amount + amount > user?.daily_withdraw_amount) {
                    return response(req, res, -100, `일일 출금금액을 넘었습니다.\n일일 출금금액:${commarNumber(user?.daily_withdraw_amount)}`, false);
                }
            }

            let settle_amount_sql = `SELECT SUM(mcht_amount) AS settle_amount FROM deposits WHERE mcht_id=${user?.id}`;
            let settle_amount = await pool.query(settle_amount_sql);
            settle_amount = settle_amount?.result[0]?.settle_amount ?? 0;
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


            let get_balance = await corpApi.balance.info({
                pay_type: 'withdraw',
                dns_data: dns_data,
                decode_user: user,
            })
            if (get_balance.data?.amount < withdraw_amount) {
                return response(req, res, -100, "출금가능금액 부족\n 본사에 문의하세요.", false)
            }
            // let account_info = await corpApi.account.info({
            //     pay_type: 'withdraw',
            //     dns_data: dns_data,
            //     decode_user: user,
            //     bank_code: withdraw_bank_code,
            //     acct_num: withdraw_acct_num,
            //     amount: withdraw_amount - (dns_data?.withdraw_fee_type == 0 ? 0 : user?.withdraw_fee),
            // })
            // if (account_info?.code != 100) {
            //     return response(req, res, -100, (account_info?.message || "서버 에러 발생"), false)
            // }


            let trx_id = (new Date().getTime()).toString().substring(1, 13);
            let first_obj = {
                brand_id: dns_data?.id,
                pay_type: pay_type,
                expect_amount: (-1) * amount,
                settle_bank_code: withdraw_bank_code,
                settle_acct_num: withdraw_acct_num,
                settle_acct_name: withdraw_acct_name,
                withdraw_fee: user?.withdraw_fee,
                user_id: user?.id,
                withdraw_status: 20,
                note: note,
                trx_id,
            }
            if (user?.level == 10) {
                first_obj['mcht_amount'] = (-1) * amount;
                first_obj['mcht_id'] = user?.id;
                for (var i = 0; i < operator_list.length; i++) {
                    first_obj['head_office_amount'] = parseFloat(getUserWithDrawFee(user, 40, operator_list, dns_data?.withdraw_head_office_fee));
                    if (user[`sales${operator_list[i].num}_id`] > 0) {
                        first_obj[`sales${operator_list[i].num}_amount`] = parseFloat(getUserWithDrawFee(user, operator_list[i].value, operator_list, dns_data?.withdraw_head_office_fee));
                        first_obj[`sales${operator_list[i].num}_id`] = user[`sales${operator_list[i].num}_id`];
                    }
                }
            } else if (user?.level < 40 && user?.level > 10) {
                for (var i = 0; i < operator_list.length; i++) {
                    if (operator_list[i]?.value == user?.level) {
                        first_obj[`sales${operator_list[i].num}_id`] = user?.id;
                        first_obj[`sales${operator_list[i].num}_amount`] = (-1) * amount;
                        break;
                    }
                }
            }
            await db.beginTransaction();
            let first_result = await insertQuery(`deposits`, first_obj);
            let withdraw_id = first_result?.result?.insertId;

            settle_amount = await pool.query(settle_amount_sql);
            settle_amount = settle_amount?.result[0]?.settle_amount ?? 0;
            if (settle_amount < 0) {
                await db.rollback();
                return response(req, res, -100, `유저 잔액은 마이너스가 될 수 없습니다.`, false)
            } else {
                await db.commit();
            }

            if (user?.is_withdraw_hold == 1) {
                return response(req, res, 100, "출금 요청이 완료되었습니다.", {});
            }

            let date = returnMoment().substring(0, 10).replaceAll('-', '');
            let api_result = await corpApi.withdraw.request({
                pay_type: 'withdraw',
                dns_data: dns_data,
                decode_user: user,
                bank_code: withdraw_bank_code,
                acct_num: withdraw_acct_num,
                amount: withdraw_amount - (dns_data?.withdraw_fee_type == 0 ? 0 : user?.withdraw_fee),
                deposit_acct_name: deposit_acct_name || withdraw_acct_name,
                trx_id,
            })
            let tid = api_result.data?.tid;

            let virtual_acct_balance = api_result?.data?.virtual_acct_balance ?? 0;
            let obj = {
                withdraw_status: 5,
                virtual_acct_balance: virtual_acct_balance,
            };
            let result = await updateQuery(`deposits`, obj, withdraw_id);

            for (var i = 0; i < 3; i++) {
                let api_result2 = await corpApi.withdraw.request_check({
                    pay_type: 'withdraw',
                    dns_data: dns_data,
                    decode_user: user,
                    date,
                    tid,
                })
                let status = 0;
                if (api_result2.data?.status == 3) {
                    status = 10;
                } else if (api_result2.data?.status == 6) {
                    continue;
                }
                if (api_result2.code == 100) {
                    let result = await updateQuery(`deposits`, {
                        withdraw_status: status,
                        amount: (status == 0 ? ((-1) * amount) : 0),
                    }, withdraw_id)
                    break;
                }
            }

            return response(req, res, 100, "success", {})

        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
    check_withdraw: async (req, res, next) => {
        try {
            let {
                api_key,
                mid,
                tid = '',
            } = req.body;

            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", false);
            }
            let dns_data = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            dns_data = dns_data?.result[0];
            let operator_list = getOperatorList(dns_data);
            if (!dns_data) {
                return response(req, res, -100, "api key가 잘못되었습니다.", false);
            }

            let mcht_sql = `SELECT ${process.env.SELECT_COLUMN_SECRET} FROM users `;
            mcht_sql += ` LEFT JOIN merchandise_columns ON merchandise_columns.mcht_id=users.id `;
            mcht_sql += ` LEFT JOIN virtual_accounts ON users.virtual_account_id=virtual_accounts.id `;
            let mcht_columns = [
                `users.*`,
                `merchandise_columns.mcht_fee`,
            ]
            for (var i = 0; i < operator_list.length; i++) {
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_id`);
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_fee`);
                mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_withdraw_fee`);
                mcht_columns.push(`sales${operator_list[i]?.num}.user_name AS sales${operator_list[i]?.num}_user_name`);
                mcht_columns.push(`sales${operator_list[i]?.num}.nickname AS sales${operator_list[i]?.num}_nickname`);
                mcht_sql += ` LEFT JOIN users AS sales${operator_list[i]?.num} ON sales${operator_list[i]?.num}.id=merchandise_columns.sales${operator_list[i]?.num}_id `;
            }
            mcht_sql += ` WHERE users.mid=? AND users.brand_id=? `;
            mcht_sql = mcht_sql.replace(process.env.SELECT_COLUMN_SECRET, mcht_columns.join())
            let user = await pool.query(mcht_sql, [mid, dns_data?.id]);
            user = user?.result[0];

            let trx = await pool.query(`SELECT * FROM deposits WHERE brand_id=? AND trx_id=? `, [
                dns_data?.id,
                tid,
            ])
            trx = trx?.result[0];
            let api_result = await corpApi.withdraw.request_check({
                pay_type: 'withdraw',
                dns_data: dns_data,
                decode_user: user,
                date: trx?.created_at.substring(0, 10).replaceAll('-', ''),
                tid,
            })
            let status = 0;
            if (api_result.data?.status == 3) {
                status = 10;
            } else if (api_result.data?.status == 6) {
                status = 20;
            }
            if (api_result.code == 100) {
                let result = await updateQuery(`deposits`, {
                    withdraw_status: status,
                    amount: (status == 0 ? trx?.expect_amount : 0),
                }, trx?.id)
                return response(req, res, 100, "success", {})
            } else {
                return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
            }
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default withdrawV3Ctrl;