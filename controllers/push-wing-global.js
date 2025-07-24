'use strict';
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { emitSocket } from "../utils.js/socket/index.js";
import { sendTelegramBot } from "../utils.js/telegram/index.js";
import { checkDns, checkLevel, commarNumber, getNumberByPercent, getOperatorList, insertResponseLog, response, setDepositAmountSetting, setWithdrawAmountSetting } from "../utils.js/util.js";
import 'dotenv/config';
import crypto from 'crypto';
import { readPool, writePool } from "../config/db-pool.js";
import logger from "../utils.js/winston/index.js";
import axios from "axios";

// AES 암호화 설정
const algorithm = 'aes-256-cbc'; // AES-256 알고리즘으로 변경

function decrypt(encryptedData, keyBase64, ivBase64) {
    try {
        const key = Buffer.from(keyBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption error:', err);
        logger.error(JSON.stringify({
            err: 'Decryption error:' + err,
            encryptedData,
            keyBase64,
            ivBase64,
        }))
        return null;
    }
}

const pushWingGlobalCtrl = {
    auth: async (req, res, next) => {
        try {
            let token_version_id = "";
            let enc_data = "";
            let integrity_value = "";
            const { auth_user_name } = req.params;
            if (req.method == 'POST') {
                token_version_id = req.body?.token_version_id;
                enc_data = req.body?.enc_data;
                integrity_value = req.body?.integrity_value;
            } else if (req.method == 'GET') {
                token_version_id = req.query?.token_version_id;
                enc_data = req.query?.enc_data;
                integrity_value = req.query?.integrity_value;
            } else {
                insertResponseLog(req, 'FAIL');
                return res.status(500).send('FAIL');
            }
            enc_data = enc_data.replaceAll('%2B', '+');
            let { data: resp } = await axios.post(`https://na.winglobalpay.com/api/v1/reqNiceDecData`, {
                tokenVersionId: token_version_id,
                encData: enc_data,
                integrityValue: integrity_value,
            },
                {
                    'Authorization': 'pk_1c3a-37cb75-b5f-ee034',
                    'Content-Type': 'application/json; charset=utf-8',
                })
            if (resp?.flag != 'success') {
                insertResponseLog(req, 'FAIL');
                return res.status(500).send('FAIL');
            }
            resp = resp?.resDataMap;
            let mcht = await readPool.query(`SELECT * FROM users WHERE auth_user_name=? AND level=10`, [auth_user_name]);
            mcht = mcht[0][0];
            let dns_data = await readPool.query(`SELECT * FROM brands WHERE id=${mcht?.brand_id}`);
            dns_data = dns_data[0][0];

            let query = {
                deposit_acct_name: resp?.name,
                phone_num: resp?.mobileno,
                birth: resp?.birthdate,
                gender: resp?.gender,
                mid: mcht?.mid,
            }
            query = new URLSearchParams(query).toString();
            res.redirect(`https://${dns_data?.dns}/virtual-account/${mcht?.mid}?${query}`);
        } catch (err) {
            console.log(err)
            insertResponseLog(req, 'FAIL');
            return res.status(500).send('FAIL');
        } finally {

        }
    },
    deposit: async (req, res, next) => {
        try {
            const {
                trxDay,
                trxTime,
                trxType,
                vactId,
                tmnId,
                mchtId,
                vactType,
                bankCd,
                account,
                sender,
                amount,
            } = req.body;

            let virtual_account = {};
            let refer_deposit_id = 0;
            if (trxType == '입금') {
                virtual_account = await writePool.query(`SELECT * FROM virtual_accounts WHERE virtual_acct_num=? AND is_delete=0`, [
                    account,
                ]);
                virtual_account = virtual_account[0][0];
            } else if (trxType == '취소') {
                let virtual_account_id = await writePool.query(`SELECT id, virtual_account_id FROM deposits WHERE trx_id=?`, [vactId]);
                virtual_account_id = virtual_account_id[0][0];
                if (!virtual_account_id) {
                    insertResponseLog(req, 'FAIL');
                    return res.status(500).send('FAIL');
                }
                refer_deposit_id = virtual_account_id?.id;
                virtual_account_id = virtual_account_id?.virtual_account_id;
                virtual_account = await writePool.query(`SELECT * FROM virtual_accounts WHERE id=?`, [
                    virtual_account_id,
                ]);
                virtual_account = virtual_account[0][0];
            }

            let dns_data = await writePool.query(`SELECT * FROM brands WHERE id=${virtual_account?.brand_id}`);
            dns_data = dns_data[0][0];
            dns_data['operator_list'] = getOperatorList(dns_data);

            let mcht_columns = [
                `users.*`,
            ]
            let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
            mcht_sql += ` WHERE users.id=${virtual_account?.mcht_id} `;
            let mcht = await writePool.query(mcht_sql);
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
                amount: amount,
                expect_amount: amount,
                deposit_bank_code,
                deposit_acct_num,
                deposit_acct_name,
                pay_type,
                trx_id: trx_id,
                trans_date,
                trans_time,
                deposit_id: refer_deposit_id,
                is_cancel: trxType == '취소' ? 1 : 0,
            };

            if (trxType == '입금' || trxType == '취소') {
                let deposit_setting = await setDepositAmountSetting(amount, mcht, dns_data);
                /*
                if (trxType == 'depositback') {
                    let deposit_setting_keys = Object.keys(deposit_setting);
                    for (var i = 0; i < deposit_setting_keys.length; i++) {
                        if (deposit_setting_keys[i].includes('amount')) {
                            deposit_setting[deposit_setting_keys[i]] = (-1) * deposit_setting[deposit_setting_keys[i]];
                        }
                    }
                }
                */

                obj = {
                    ...obj,
                    head_office_fee: dns_data?.head_office_fee,
                    deposit_fee: mcht?.deposit_fee ?? 0,
                    ...deposit_setting,
                }
            }
            let deposit_id = 0;
            if (trx_id) {
                let exist_deposit = await writePool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=?`, [
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
    deposit_mcht: async (req, res, next) => {
        try {
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

export default pushWingGlobalCtrl;

