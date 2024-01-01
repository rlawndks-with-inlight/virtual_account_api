'use strict';
import { pool } from "../config/db.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { checkDns, checkLevel, getNumberByPercent, getOperatorList, response } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushDoznCtrl = {
    deposit: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                acctNo,
                finCode,
                tranNum,
                tranDate,
                tranTime,
                depositAmnt,
                withdrawAmnt,
                balance,
                tranName,
                tranDetail,
                tranBranch,
                recvAccntNo,
                memo,
                crnCd,
            } = req.body;

            return res.send('0000');
        } catch (err) {
            console.log(err)
            return res.send(-100);
        } finally {

        }
    },
    withdraw: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                acctNo,
                finCode,
                tranNum,
                tranDate,
                tranTime,
                depositAmnt,
                withdrawAmnt,
                balance,
                tranName,
                tranDetail,
                tranBranch,
                recvAccntNo,
                memo,
                crnCd,
            } = req.body;

            return res.send('0000');
        } catch (err) {
            console.log(err)
            return res.send(-100);
        } finally {

        }
    },
    withdrawFail: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                mid,
                bankCd,
                account,
                name,
                phoneNo,
            } = req.body;
            console.log(req.body)
            let obj = {

            };
            return response(req, res, 100, "success", {})
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default pushDoznCtrl;
