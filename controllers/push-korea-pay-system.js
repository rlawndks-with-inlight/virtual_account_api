'use strict';
import { readPool } from "../config/db-pool.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, selectQueryByColumn, updateQuery } from "../utils.js/query-util.js";
import { emitSocket } from "../utils.js/socket/index.js";
import { sendTelegramBot } from "../utils.js/telegram/index.js";
import { checkDns, checkLevel, commarNumber, getNumberByPercent, getOperatorList, insertResponseLog, response, setDepositAmountSetting, setWithdrawAmountSetting } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushKoreaPaySystemCtrl = {
    issue: async (req, res, next) => {
        try {
            const {
                mchtId,
                trxType,
                issueId,
                account,
                withdrawBankCd,
                withdrawAccount,
                identity,
                phoneNo,
                ci,
                name,
                trackId,
                udf1,
                udf2,
            } = req.body;
            let dns_data = await readPool.query(`SELECT * FROM brands WHERE deposit_api_id=?`, [mchtId]);
            dns_data = dns_data[0][0];
            dns_data['operator_list'] = getOperatorList(dns_data);
            let virtual_account_sql = `SELECT id FROM virtual_accounts WHERE tid=? AND brand_id=${dns_data?.id} AND is_delete=0 AND status=0  `;
            let virtual_account_values = [
                issueId,
            ]
            if (trackId) {
                virtual_account_sql += ` AND guid=? `;
                virtual_account_values.push(trackId)
            } else {
                virtual_account_sql += ` AND deposit_acct_name=? `;
                virtual_account_values.push(name)
            }
            let virtual_account = await readPool.query(virtual_account_sql, virtual_account_values);
            virtual_account = virtual_account[0][0];
            let obj = {
                brand_id: dns_data?.id,
                deposit_bank_code: withdrawBankCd,
                deposit_acct_num: withdrawAccount,
                deposit_acct_name: name,
                phone_num: phoneNo,
                birth: identity,
                guid: trackId,
                virtual_bank_code: dns_data?.deposit_virtual_bank_code,
                virtual_acct_num: account,
            }
            let mcht_columns = [
                `users.id`,
            ]
            let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
            mcht_sql += ` WHERE users.mid=${udf1} `;
            let mcht = await readPool.query(mcht_sql);
            mcht = mcht[0][0];
            obj['mcht_id'] = mcht?.id;
            obj['user_id'] = mcht?.id;
            if (virtual_account) {
                let result = await updateQuery('virtual_accounts', obj, virtual_account?.id);
            } else {
                let result = await insertQuery('virtual_accounts', obj);
            }

            insertResponseLog(req, 'OK');
            return res.status(200).send('OK');
        } catch (err) {
            console.log(err)
            insertResponseLog(req, 'FAIL');
            return res.status(500).send('FAIL');
        } finally {

        }
    },
    deposit: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            let { response } = req.body;
            if (typeof response == 'string') {
                response = JSON.parse(response ?? '{}');
            }
            const {
                vactId,
                retry,
                mchtId,
                issueId,
                bankCd,
                account,
                sender,
                amount,
                trxType,
                rootVactId,
                trxDay,
                trxTime,
                trackId = "",
                udf1,
                udf2,
                stlDay,
                stlAmount,
                stlFee = 0,
                stlFeeVat = 0,
                resultMsg,
            } = response;
            let dns_data = await readPool.query(`SELECT * FROM brands WHERE deposit_api_id=?`, [mchtId]);
            dns_data = dns_data[0][0];
            dns_data['operator_list'] = getOperatorList(dns_data);
            let virtual_account_sql = `SELECT * FROM virtual_accounts WHERE brand_id=${dns_data?.id} `;
            let virtual_account_values = [
            ]
            if (trackId) {
                virtual_account_sql += ` AND guid=? `;
                virtual_account_values.push(trackId)
            } else {
                virtual_account_sql += ` AND deposit_acct_name=? `;
                virtual_account_values.push(sender)
            }
            let virtual_account = await readPool.query(virtual_account_sql, virtual_account_values);
            virtual_account = virtual_account[0][0];

            let mcht_columns = [
                `users.*`,
            ]
            let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
            mcht_sql += ` WHERE users.id=${virtual_account?.mcht_id} `;
            let mcht = await readPool.query(mcht_sql);
            mcht = mcht[0][0];

            let trx_id = vactId;
            let deposit_bank_code = virtual_account?.deposit_bank_code
            let deposit_acct_num = virtual_account?.deposit_acct_num
            let deposit_acct_name = virtual_account?.deposit_acct_name

            let pay_type = 0;
            let trans_date = `${trxDay.substring(0, 4)}-${trxDay.substring(4, 6)}-${trxDay.substring(6, 8)}`;
            let trans_time = `${trxTime.substring(0, 2)}:${trxTime.substring(2, 4)}:${trxTime.substring(4, 6)}`;
            let obj = {
                brand_id: mcht?.brand_id,
                mcht_id: mcht?.id,
                virtual_account_id: virtual_account?.id ?? 0,
                amount: (trxType == 'deposit' || trxType == 'depositback') ? amount : 0,
                expect_amount: trxType == 'depositback' ? (-1) * amount : amount,
                deposit_bank_code,
                deposit_acct_num,
                deposit_acct_name,
                pay_type,
                trx_id: trx_id,
                note: resultMsg || '',
                trans_date,
                trans_time,
                top_office_amount: parseInt(stlFee) + parseInt(stlFeeVat),
            };
            if (trxType == 'deposit' || trxType == 'depositback') {
                let deposit_setting = await setDepositAmountSetting(amount, mcht, dns_data);
                if (trxType == 'depositback') {
                    let deposit_setting_keys = Object.keys(deposit_setting);
                    for (var i = 0; i < deposit_setting_keys.length; i++) {
                        if (deposit_setting_keys[i].includes('amount')) {
                            deposit_setting[deposit_setting_keys[i]] = (-1) * deposit_setting[deposit_setting_keys[i]];
                        }
                    }
                }
                obj = {
                    ...obj,
                    head_office_fee: dns_data?.head_office_fee,
                    deposit_fee: mcht?.deposit_fee ?? 0,
                    ...deposit_setting,
                }
            }
            let deposit_id = 0;
            if (trx_id) {
                let exist_deposit = await readPool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=?`, [
                    trx_id,
                    mcht?.brand_id,
                ])
                exist_deposit = exist_deposit[0][0];
                if (!exist_deposit) {
                    let result = await insertQuery(`deposits`, obj);
                    deposit_id = result?.insertId;
                }
            }
            let telegram_message = '';
            telegram_message += `${dns_data?.name}\n`;
            telegram_message += `${mcht?.nickname}\n`;
            telegram_message += `입금금액: ${commarNumber(amount)}원\n`;
            if (virtual_account?.virtual_user_name) {
                telegram_message += `회원아이디: ${virtual_account?.virtual_user_name}\n`;
            }
            telegram_message += `입금자명: ${virtual_account?.deposit_acct_name}\n`;
            telegram_message += `입금일시: ${trans_date} ${trans_time}\n`;

            sendTelegramBot(dns_data, telegram_message, JSON.parse(mcht?.telegram_chat_ids ?? '[]'));
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
            insertResponseLog(req, 'OK');
            return res.status(200).send('OK');
        } catch (err) {
            console.log(err)
            insertResponseLog(req, 'FAIL');
            return res.status(500).send('FAIL');
        } finally {

        }
    },
    withdraw: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                trxId,
                mchtId,
                trackId = "",
                status,
                trxDay,
                trxTime,
                resultCd,
                resultMsg,
                amount,
            } = req.body;
            let dns_data = await readPool.query(`SELECT * FROM brands WHERE deposit_api_id=?`, [mchtId]);
            dns_data = dns_data[0][0];
            dns_data['operator_list'] = getOperatorList(dns_data);

            let user = await readPool.query(`SELECT * FROM users WHERE id=?`, [
                parseInt(trackId.split('-')[1] ?? 0),
            ])
            user = user[0][0];


            let exist_deposit = await readPool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=?`, [
                trxId,
                dns_data?.id,
            ])
            exist_deposit = exist_deposit[0][0];
            let withdraw_id = exist_deposit?.id ?? 0;
            let withdraw_status = status == '출금완료' ? 0 : 10;
            let top_office_amount = status == '출금완료' ? (exist_deposit?.top_office_amount || dns_data?.withdraw_head_office_fee) : 0;
            let withdraw_amount = amount;
            let obj = {
                withdraw_status,
                top_office_amount,
                trans_date: trxDay,
                trans_time: trxTime,
            }

            if (exist_deposit) {
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
                let result = await updateQuery(`deposits`, obj, withdraw_id);
            } else {
                let withraw_obj = await setWithdrawAmountSetting(withdraw_amount, user, dns_data);
                obj = {
                    ...obj,
                    brand_id: dns_data?.id,
                    trx_id: trxId,
                    pay_type: 5,
                    settle_bank_code: 'XX',
                    settle_acct_num: '잘못된 계좌번호',
                    settle_acct_name: '잘못된 예금주명',
                }
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


            insertResponseLog(req, 'OK');
            return res.status(200).send('OK');
        } catch (err) {
            console.log(err)
            insertResponseLog(req, 'FAIL');
            return res.status(500).send('FAIL');
        } finally {

        }
    },
};

export default pushKoreaPaySystemCtrl;
