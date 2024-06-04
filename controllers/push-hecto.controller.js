'use strict';
import { pool } from "../config/db.js";
import 'dotenv/config';
import { insertQuery } from '../utils.js/query-util.js'
import corpApi from "../utils.js/corp-util/index.js";
import { emitSocket } from "../utils.js/socket/index.js";
import { insertLog, insertResponseLog } from "../utils.js/util.js";
//노티 받기
const pushHectoCtrl = {
    deposit: async (req, res, next) => {
        try {
            const {
                notiType,
                mchtId,
                dpDt = "",
                dpTm = "",
                dpTrdNo,
                outStatCd,
                dpCrcCd,
                dpAmt,
                blc,
                bankCd,
                vtlAcntNo,
                treatBankCd,
                dpStrNm,
            } = req.body;
            console.log(req.body)
            //console.log(data)
            let dns_data = await pool.query(`SELECT * FROM brands WHERE withdraw_mid=? `, [
                mchtId
            ]);
            dns_data = dns_data?.result[0];
            let trx_id = dpTrdNo;
            let amount = dpAmt ?? 0;
            let insert_obj = {
                brand_id: dns_data?.id,
                amount: amount,
                expect_amount: amount,
                pay_type: 0,
                expect_amount: amount,
                deposit_bank_code: treatBankCd,
                deposit_acct_num: '',
                deposit_acct_name: dpStrNm,
                virtual_bank_code: bankCd,
                virtual_acct_num: vtlAcntNo,
                trx_id: trx_id,
                is_type_withdraw_acct: 1,
                trans_date: `${dpDt.substring(0, 4)}-${dpDt.substring(4, 6)}-${dpDt.substring(6, 8)}`,
                trans_time: `${dpTm.substring(0, 2)}:${dpTm.substring(2, 4)}:${dpTm.substring(4, 6)}`
            }
            let deposit = await pool.query(`SELECT * FROM deposits WHERE trx_id=? AND brand_id=${dns_data?.id}`, [trx_id]);
            deposit = deposit?.result[0];
            if (deposit) {
                insertResponseLog(req, '0000');
                return res.send('OK');
            }

            insert_obj['virtual_acct_balance'] = blc ?? 0;

            let result = await insertQuery(`deposits`, insert_obj);
            let bell_data = {
                amount: parseInt(amount),
                user_id: 0,
                deposit_acct_name: dpStrNm,
                nickname: '',
            }
            emitSocket({
                method: 'deposit',
                brand_id: dns_data?.id,
                data: bell_data
            })
            insertResponseLog(req, '0000');

            return res.send('OK');

        } catch (err) {
            console.log(err)
            insertResponseLog(req, '9999');
            return res.send('FAIL');
        } finally {

        }
    },
};

export default pushHectoCtrl;
