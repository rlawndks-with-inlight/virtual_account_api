'use strict';
import { pool } from "../config/db.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { checkDns, checkLevel, getNumberByPercent, getOperatorList, insertResponseLog, response, setDepositAmountSetting } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushKoreaPaySystemCtrl = {
    deposit: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
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
                trackId,
                udf1,
                udf2,
                stlDay,
                stlAmount,
                stlFee,
                stlFeeVat,
            } = req.body;
            let dns_data = await pool.query(`SELECT * FROM brands WHERE deposit_api_id=?`, [mchtId]);
            dns_data = dns_data?.result[0];
            dns_data['operator_list'] = getOperatorList(dns_data);

            let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE tid=? AND brand_id=${dns_data?.id}`, [
                issueId,
            ]);
            virtual_account = virtual_account?.result[0];

            let mcht_columns = [
                `users.*`,
            ]
            let mcht_sql = `SELECT ${mcht_columns.join()} FROM users `
            mcht_sql += ` WHERE users.id=${virtual_account?.mcht_id} `;
            let mcht = await pool.query(mcht_sql);
            mcht = mcht?.result[0];

            let trx_id = vactId;
            let deposit_bank_code = virtual_account?.deposit_bank_code
            let deposit_acct_num = virtual_account?.deposit_acct_num
            let deposit_acct_name = virtual_account?.deposit_acct_name
            let pay_type = trxType == 'deposit' ? 0 : 2;
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
            console.log(obj)
            if (exist_deposit) {
                deposit_id = exist_deposit?.id;
            } else {
                exist_deposit = {};
                let result = await insertQuery(`deposits`, obj);
                deposit_id = result?.result?.insertId;
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
    withdraw: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const { brand_id } = req.params;
            const {
                trxId,
                mchtId,
                status,
                trxDay,
                trxTime,
                resultCd,
                resultMsg,
                amount,
            } = req.body;
            let dns_data = await pool.query(`SELECT * FROM brands WHERE id=?`, [brand_id]);
            dns_data = dns_data?.result[0];
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

export default pushKoreaPaySystemCtrl;
