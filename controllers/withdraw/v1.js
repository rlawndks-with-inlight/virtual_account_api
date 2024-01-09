'use strict';
import db, { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, commarNumber, getOperatorList, isItemBrandIdSameDnsId, response, settingFiles } from "../../utils.js/util.js";
import 'dotenv/config';

const table_name = 'virtual_accounts';

const withdrawV1Ctrl = {
    request: async (req, res, next) => {//발급요청
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                api_key,
                mid,
                withdraw_amount,
            } = req.body;
            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand?.result[0];
            let operator_list = getOperatorList(brand);
            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
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
            let user = await pool.query(mcht_sql, [mid, brand?.id]);
            user = user?.result[0];

            let amount = parseInt(withdraw_amount) + user?.withdraw_fee;
            let pay_type_name = '';
            let pay_type = 5;
            if (pay_type == 5) {
                pay_type_name = '출금';
            } else if (pay_type == 20) {
                pay_type_name = '반환';
            } else {
                return response(req, res, -100, "결제타입에러", false)
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
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@')
            let get_balance = await corpApi.balance.info({
                pay_type: 'withdraw',
                dns_data: brand,
                decode_user: user,
            })
            console.log(get_balance)
            if (get_balance.data?.amount < withdraw_amount) {
                return response(req, res, -100, "출금 가능 금액보다 출금액이 더 큽니다.", false)
            }
            let account_info = await corpApi.account.info({
                pay_type: 'withdraw',
                dns_data: brand,
                decode_user: user,
                bank_code: user?.withdraw_bank_code,
                acct_num: user?.withdraw_acct_num,
                amount: withdraw_amount,
            })
            console.log(get_balance)
            if (account_info?.code != 100) {
                return response(req, res, -100, "예금주를 찾을 수 없습니다.", false)
            }

            let date = returnMoment().substring(0, 10).replaceAll('-', '');
            let api_result = await corpApi.withdraw.request({
                pay_type: 'withdraw',
                dns_data: brand,
                decode_user: user,
                bank_code: user?.withdraw_bank_code,
                acct_num: user?.withdraw_acct_num,
                amount: withdraw_amount,
            })
            console.log(api_result)
            if (api_result?.code != 100) {
                //   return response(req, res, -100, (api_result?.message || "서버 에러 발생"), false)
            }
            let tid = account_info.data?.tid;

            let api_result2 = await corpApi.withdraw.request_check({
                pay_type: 'withdraw',
                dns_data: brand,
                decode_user: user,
                date,
                tid,
            })
            console.log(api_result2)
            return response(req, res, 100, "success", {})

        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default withdrawV1Ctrl;
