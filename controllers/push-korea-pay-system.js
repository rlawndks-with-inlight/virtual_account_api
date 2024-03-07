'use strict';
import { pool } from "../config/db.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { checkDns, checkLevel, getNumberByPercent, getOperatorList, insertResponseLog, response } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushKoreaPaySystemCtrl = {
    deposit: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const { brand_id } = req.params;
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
