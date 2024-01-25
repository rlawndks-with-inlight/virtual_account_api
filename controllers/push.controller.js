'use strict';
import { pool } from "../config/db.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { emitSocket } from "../utils.js/socket/index.js";
import { sendTelegramBot } from "../utils.js/telegram/index.js";
import { checkDns, checkLevel, commarNumber, getNumberByPercent, getOperatorList, response } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushCtrl = {
    deposit: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                trx_tp,
                trx_amt,
                api_sign_val,
                guid,
                vacnt_no,
                bal_tot_amt,
                vbank_id,
                trx_stat,
                tid,
            } = req.body;

            let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE guid=?`, [
                guid,
            ]);
            virtual_account = virtual_account?.result[0];

            let dns_data = await pool.query(`SELECT * FROM brands WHERE id=${virtual_account?.brand_id}`);
            dns_data = dns_data?.result[0];
            dns_data['operator_list'] = getOperatorList(dns_data);
            let mcht_columns = [
                `users.*`,
                `merchandise_columns.mcht_fee`
            ]
            for (var i = 0; i < dns_data?.operator_list.length; i++) {
                mcht_columns.push(`merchandise_columns.sales${dns_data?.operator_list[i]?.num}_id`);
                mcht_columns.push(`merchandise_columns.sales${dns_data?.operator_list[i]?.num}_fee`);
            }
            let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
            mcht_sql += ` LEFT JOIN merchandise_columns ON merchandise_columns.mcht_id=users.id `;
            mcht_sql += ` WHERE users.id=${virtual_account?.mcht_id} `;
            let mcht = await pool.query(mcht_sql);
            mcht = mcht?.result[0];


            let trx_id = tid;
            let amount = parseInt(trx_amt);
            let deposit_bank_code = virtual_account?.deposit_bank_code
            let deposit_acct_num = virtual_account?.deposit_acct_num
            let deposit_acct_name = virtual_account?.deposit_acct_name
            let pay_type = 0
            let obj = {
                brand_id: mcht?.brand_id,
                mcht_id: mcht?.id,
                virtual_account_id: virtual_account?.id,
                amount,
                expect_amount: amount,
                deposit_bank_code,
                deposit_acct_num,
                deposit_acct_name,
                pay_type,
                trx_id: trx_id,
                head_office_fee: dns_data?.head_office_fee,
                deposit_fee: mcht?.deposit_fee ?? 0
            };

            let is_use_sales = false;
            let is_first = true;
            let sales_depth_num = -1;
            let minus_fee = dns_data?.head_office_fee;
            for (var i = 0; i < dns_data?.operator_list.length; i++) {
                if (mcht[`sales${dns_data?.operator_list[i]?.num}_id`] > 0) {
                    is_use_sales = true;
                    if (is_first) {
                        obj[`head_office_amount`] = getNumberByPercent(amount, mcht[`sales${dns_data?.operator_list[i]?.num}_fee`] - minus_fee)
                    }
                    is_first = false;
                } else {
                    continue;
                }
                if (sales_depth_num >= 0) {
                    obj[`sales${sales_depth_num}_amount`] = getNumberByPercent(amount, mcht[`sales${dns_data?.operator_list[i]?.num}_fee`] - minus_fee)
                }
                obj[`sales${dns_data?.operator_list[i]?.num}_id`] = mcht[`sales${dns_data?.operator_list[i]?.num}_id`];
                obj[`sales${dns_data?.operator_list[i]?.num}_fee`] = mcht[`sales${dns_data?.operator_list[i]?.num}_fee`];
                minus_fee = obj[`sales${dns_data?.operator_list[i]?.num}_fee`];
                sales_depth_num = dns_data?.operator_list[i]?.num;
            }
            if (!is_use_sales) {
                obj[`head_office_amount`] = getNumberByPercent(amount, mcht[`mcht_fee`] - minus_fee);
            } else {
                obj[`sales${sales_depth_num}_amount`] = getNumberByPercent(amount, mcht[`mcht_fee`] - minus_fee);
            }
            obj[`mcht_fee`] = mcht[`mcht_fee`];
            obj[`mcht_amount`] = getNumberByPercent(amount, 100 - mcht[`mcht_fee`]) - (mcht?.deposit_fee ?? 0);

            let deposit_id = 0;

            let exist_deposit = await pool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=?`, [
                trx_id,
                mcht?.brand_id
            ])
            exist_deposit = exist_deposit?.result[0];
            if (exist_deposit) {
                deposit_id = exist_deposit?.id;
            } else {
                exist_deposit = {};
                let result = await insertQuery(`deposits`, obj);
                deposit_id = result?.result?.insertId;
            }

            if (exist_deposit?.is_move_mother == 1) {
                return res.send('0000');
            }
            let mother_to_result = await corpApi.transfer.pass({
                pay_type: 'deposit',
                dns_data,
                decode_user: mcht,
                from_guid: virtual_account?.guid,
                to_guid: dns_data[`deposit_guid`],
                amount: amount,
            })
            if (mother_to_result.code == 100) {
                let obj = {
                    is_move_mother: 1,
                    move_mother_tid: mother_to_result.data?.tid,
                }
                if (mcht?.deposit_noti_url) {
                    obj[`deposit_noti_status`] = 5;
                    obj[`deposit_noti_obj`] = JSON.stringify({
                        amount,
                        bank_code: deposit_bank_code,
                        acct_num: deposit_acct_num,
                        acct_name: deposit_acct_name,
                        tid: tid,
                    });
                }
                let update_mother_to_result = await updateQuery('deposits', obj, deposit_id);
            }
            sendTelegramBot(dns_data, `${dns_data?.name}\n${mcht?.nickname} ${virtual_account?.deposit_acct_name} 님이 ${commarNumber(amount)}원을 입금하였습니다.`, JSON.parse(mcht?.telegram_chat_ids ?? '[]'));
            let bell_data = {
                amount,
                user_id: mcht?.id,
                deposit_acct_name,
                nickname: mcht?.nickname,
            }
            emitSocket({
                method: 'deposit',
                brand_id: dns_data?.id,
                data: bell_data
            })
            return res.send('0000');
        } catch (err) {
            console.log(err)
            return res.send('9999');
        }
    },
    withdraw: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                trx_tp,
                trx_amt,
                api_sign_val,
                guid,
                trx_stat,
                tid,
            } = req.body;
            let amount = parseInt(trx_amt);
            let trx = await pool.query(`SELECT * FROM deposits WHERE trx_id=?`, [
                tid,
            ])
            trx = trx?.result[0];
            let withdraw_status = trx_stat == 'WITHDRAW_SUCCESS' ? 0 : 10;
            let update_trx = await updateQuery(`deposits`, {
                withdraw_status,
                amount: (-1) * (amount + trx?.withdraw_fee),
            }, trx?.id);

            return res.send('0000');
        } catch (err) {
            console.log(err)
            return res.send('9999');
        } finally {

        }
    },
    withdrawFail: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                trx_tp,
                trx_amt,
                api_sign_val,
                guid,
                trx_stat,
                tid,
            } = req.body;
            let amount = parseInt(trx_amt);
            let trx = await pool.query(`SELECT * FROM deposits WHERE trx_id=?`, [
                tid,
            ])
            trx = trx?.result[0];
            let withdraw_status = trx_stat == 'WITHDRAW_SUCCESS' ? 0 : 10;
            let update_trx = await updateQuery(`deposits`, {
                withdraw_status,
                amount: (-1) * (amount + trx?.withdraw_fee),
            }, trx?.id);

            return res.send('0000');
        } catch (err) {
            console.log(err)
            return res.send('9999');
        } finally {

        }
    },
};

export default pushCtrl;
