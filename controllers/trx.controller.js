'use strict';
import { pool } from "../config/db.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../utils.js/query-util.js";
import { checkDns, checkLevel, isItemBrandIdSameDnsId, response, settingFiles } from "../utils.js/util.js";
import 'dotenv/config';

const trxCtrl = {
    push: {
        deposit: async (req, res, next) => {
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const { } = req.body;


                return response(req, res, 100, "success", data);
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        withdraw: async (req, res, next) => {
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const { } = req.body;


                return response(req, res, 100, "success", data);
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        withdrawFail: async (req, res, next) => {
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const { } = req.body;


                return response(req, res, 100, "success", data);
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    },
};

export default trxCtrl;
