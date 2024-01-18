'use strict';
import { pool } from "../config/db.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { checkDns, checkLevel, getNumberByPercent, getOperatorList, response } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushCooconCtrl = {
    deposit: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const { brand_id } = req.params;
            const {
                compUuid,
                compNm,
                acctIssuedSeq,
                orderId,
                orderItemNm,
                tranDiv,
                acctDiv,
                bankCode,
                bankAcctNo,
                clientNm,
                amount,
                tranDate,
                tranTime,
                fee,
                feeVat,
                serverType,
                realCompId,
            } = req.body;

            let dns_data = await pool.query(`SELECT * FROM brands WHERE id=?`, [brand_id]);
            dns_data = dns_data?.result[0];



            return res.send('0000');
        } catch (err) {
            console.log(err)
            return res.send(-100);
        } finally {

        }
    },
};

export default pushCooconCtrl;
