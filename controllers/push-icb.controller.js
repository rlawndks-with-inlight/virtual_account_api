'use strict';
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl, returnMoment } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { emitSocket } from "../utils.js/socket/index.js";
import { sendTelegramBot } from "../utils.js/telegram/index.js";
import { checkDns, checkLevel, commarNumber, getNumberByPercent, getOperatorList, insertResponseLog, response, setDepositAmountSetting, setWithdrawAmountSetting } from "../utils.js/util.js";
import 'dotenv/config';
import crypto from 'crypto';
import { readPool } from "../config/db-pool.js";
import logger from "../utils.js/winston/index.js";

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

const pushIcbCtrl = {
    deposit: async (req_, res, next) => {
        let req = req_;
        try {

            let {
                mid,
                memKey,
                trxNo,
                partnerTrxNo,
                bankCd,
                virtAcntNo,
                depositNm,
                payCmpDts,
                realTrxAmt,

                realBankCd,
                realDepoAcntNo,
                realDepoNm,
            } = req.body;
            logger.info(JSON.stringify(req.body));
            //trx_amt , guid, tid,
            let dns_data = await readPool.query(`SELECT * FROM brands WHERE deposit_api_id=? AND deposit_corp_type=7`, [
                mid,
            ]);
            dns_data = dns_data[0][0];
            dns_data['operator_list'] = getOperatorList(dns_data);
            memKey = decrypt(memKey, dns_data?.deposit_sign_key, dns_data?.deposit_iv)
            realDepoAcntNo = decrypt(realDepoAcntNo, dns_data?.deposit_sign_key, dns_data?.deposit_iv)
            realDepoNm = decrypt(realDepoNm, dns_data?.deposit_sign_key, dns_data?.deposit_iv)

            let virtual_account = await readPool.query(`SELECT * FROM virtual_accounts WHERE guid=?`, [
                memKey,
            ]);
            req.body = {
                ...req.body,
                memKey,
                realDepoAcntNo,
                realDepoNm,
            }
            virtual_account = virtual_account[0][0];


            let mcht_columns = [
                `users.*`,
            ]
            let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
            mcht_sql += ` WHERE users.id=${virtual_account?.mcht_id} `;
            let mcht = await readPool.query(mcht_sql);
            mcht = mcht[0][0];

            let trx_id = partnerTrxNo;
            let amount = parseInt(realTrxAmt);
            let deposit_bank_code = virtual_account?.deposit_bank_code;
            let deposit_acct_num = virtual_account?.deposit_acct_num;
            let deposit_acct_name = virtual_account?.deposit_acct_name;
            let pay_type = 0;
            let trans_date = `${payCmpDts.substring(0, 4)}-${payCmpDts.substring(4, 6)}-${payCmpDts.substring(6, 8)}`;
            let trans_time = `${payCmpDts.substring(8, 10)}:${payCmpDts.substring(10, 12)}:${payCmpDts.substring(12, 14)}`;
            let obj = {
                brand_id: mcht?.brand_id,
                mcht_id: mcht?.id,
                virtual_account_id: virtual_account?.id,
                amount,
                deposit_bank_code: realBankCd || deposit_bank_code,
                deposit_acct_num: realDepoAcntNo || deposit_acct_num,
                deposit_acct_name: realDepoNm || deposit_acct_name,
                pay_type,
                trx_id: trx_id,
                head_office_fee: dns_data?.head_office_fee,
                deposit_fee: mcht?.deposit_fee ?? 0,
                is_hand: 0,
                trans_date,
                trans_time,
                deposit_status: 0,
                is_delete: 0
            };
            let deposit_setting = await setDepositAmountSetting(amount, mcht, dns_data);
            obj = {
                ...obj,
                ...deposit_setting,
            }
            let deposit_id = 0;

            let exist_deposit = await readPool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=?`, [
                trx_id,
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
                return res.send('9999');
            }

            let noti_process_obj = {}
            noti_process_obj[`deposit_noti_status`] = 5;
            let noti_data = {
                amount,
                bank_code: deposit_bank_code,
                acct_num: deposit_acct_num,
                acct_name: deposit_acct_name,
                created_at: returnMoment(),
                tid: trx_id,
            }
            noti_process_obj[`deposit_noti_obj`] = JSON.stringify(noti_data);
            let update_mother_to_result = await updateQuery('deposits', noti_process_obj, deposit_id);
            sendTelegramBot(dns_data, `${returnMoment()} ${dns_data?.name}\n${mcht?.nickname} ${virtual_account?.deposit_acct_name} 님이 ${commarNumber(amount)}원을 입금하였습니다.`, JSON.parse(mcht?.telegram_chat_ids ?? '[]'));
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

};

export default pushIcbCtrl;

