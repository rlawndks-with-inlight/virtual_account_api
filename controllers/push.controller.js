'use strict';
import { pool } from "../config/db.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { emitSocket } from "../utils.js/socket/index.js";
import { sendTelegramBot } from "../utils.js/telegram/index.js";
import { checkDns, checkLevel, commarNumber, getNumberByPercent, getOperatorList, insertResponseLog, response, setDepositAmountSetting, setWithdrawAmountSetting } from "../utils.js/util.js";
import 'dotenv/config';
import { makeSignValueSha256 } from "./withdraw/v2.js";

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
            ]
            let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
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
            let deposit_setting = await setDepositAmountSetting(amount, mcht, dns_data);
            obj = {
                ...obj,
                ...deposit_setting,
            }
            let deposit_id = 0;

            let exist_deposit = await pool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=?`, [
                trx_id,
                mcht?.brand_id
            ])
            exist_deposit = exist_deposit?.result[0];
            if (exist_deposit) {
                deposit_id = exist_deposit?.id;
                let result = await updateQuery(`deposits`, obj, deposit_id);
            } else {
                exist_deposit = {};
                let result = await insertQuery(`deposits`, obj);
                deposit_id = result?.result?.insertId;
            }
            if (!(deposit_id > 0)) {
                return res.send('9999');
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
                obj[`deposit_noti_status`] = 5;
                let noti_data = {
                    amount,
                    bank_code: deposit_bank_code,
                    acct_num: deposit_acct_num,
                    acct_name: deposit_acct_name,
                    tid: tid,
                }
                if (dns_data?.is_use_sign_key == 1) {
                    noti_data['api_sign_val'] = makeSignValueSha256(`${dns_data?.api_key}${mcht?.mid ?? ""}${mcht?.sign_key ?? ""}`)
                }
                obj[`deposit_noti_obj`] = JSON.stringify(noti_data);
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

            insertResponseLog({ ...req }, '0000');
            return res.send('0000');
        } catch (err) {
            console.log(err)
            insertResponseLog(req, '9999');
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
                guid = "",
                trx_stat,
                tid,
            } = req.body;
            let trx = await pool.query(`SELECT * FROM deposits WHERE trx_id=?`, [
                tid,
            ])
            trx = trx?.result[0];
            let withdraw_amount = Math.abs(parseInt(trx_amt));
            let amount = trx_stat == 'WITHDRAW_SUCCESS' ? ((-1) * (parseInt(withdraw_amount) + trx?.withdraw_fee)) : 0;
            let withdraw_status = trx_stat == 'WITHDRAW_SUCCESS' ? 0 : 10;

            let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE guid=?`, [guid]);
            virtual_account = virtual_account?.result[0];
            let brand_id = virtual_account?.brand_id ?? 0;
            let dns_data = await pool.query(`SELECT * FROM brands WHERE id=?`, [brand_id]);
            dns_data = dns_data?.result[0];
            let operator_list = getOperatorList(dns_data);

            if (trx) {
                let user = {};
                if (trx?.mcht_id > 0) {
                    user.id = trx?.mcht_id;
                } else {
                    for (var i = 0; i < operator_list.length; i++) {
                        if (trx[`sales${operator_list[i]?.num}_id`] > 0) {
                            user.id = trx[`sales${operator_list[i]?.num}_id`];
                            break;
                        }
                    }
                }
                if (dns_data) {
                    user = await pool.query(`SELECT * FROM users WHERE id=? AND brand_id=${dns_data?.id} AND is_delete=0`, [
                        user?.id
                    ]);
                    user = user?.result[0];
                }

                let obj = {
                    withdraw_status,
                    amount: amount,
                }
                let withraw_obj = await setWithdrawAmountSetting(withdraw_amount, user, dns_data);

                if (withdraw_status == 0) {
                    obj = {
                        ...obj,
                        ...withraw_obj,
                    }
                }
                let update_trx = await updateQuery(`deposits`, obj, trx?.id);
            } else {

                let user = {};
                if (dns_data) {
                    user = await pool.query(`SELECT * FROM users WHERE id=? AND brand_id=${dns_data?.id} AND is_delete=0`, [
                        virtual_account?.mcht_id
                    ]);
                    user = user?.result[0];
                }
                amount = trx_stat == 'WITHDRAW_SUCCESS' ? ((-1) * (parseInt(withdraw_amount) + user?.withdraw_fee)) : 0;
                let obj = {
                    trx_id: tid,
                    brand_id,
                    pay_type: 5,
                    amount,
                    expect_amount: amount,
                    withdraw_status,
                    virtual_account_id: virtual_account?.id,
                    user_id: user?.id ?? 0,
                    withdraw_fee_type: dns_data?.withdraw_fee_type,
                    settle_bank_code: virtual_account?.deposit_bank_code,
                    settle_acct_num: virtual_account?.deposit_acct_num,
                    settle_acct_name: virtual_account?.deposit_acct_name,
                }
                let withraw_obj = await setWithdrawAmountSetting(withdraw_amount, user, dns_data);
                if (withdraw_status == 0) {
                    obj = {
                        ...obj,
                        ...withraw_obj,
                    }
                }
                if (withdraw_status != 0) {
                    obj['amount'] = 0;
                }
                let result = await insertQuery(`deposits`, obj);
            }
            insertResponseLog(req, '0000');
            return res.send('0000');
        } catch (err) {
            console.log(err)
            insertResponseLog(req, '9999');
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
            let trx = await pool.query(`SELECT * FROM deposits WHERE trx_id=?`, [
                tid,
            ])
            trx = trx?.result[0];
            let amount = trx_stat == 'WITHDRAW_SUCCESS' ? ((-1) * (parseInt(trx_amt) + trx?.withdraw_fee)) : 0;
            let withdraw_status = trx_stat == 'WITHDRAW_SUCCESS' ? 0 : 10;
            let update_trx = await updateQuery(`deposits`, {
                withdraw_status,
                amount: amount,
            }, trx?.id);
            insertResponseLog(req, '0000');
            return res.send('0000');
        } catch (err) {
            console.log(err)
            insertResponseLog(req, '9999');
            return res.send('9999');
        } finally {

        }
    },
};

export default pushCtrl;