'use strict';
import { pool } from "../config/db.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { checkDns, checkLevel, response } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushCtrl = {
    deposit: async (req, res, next) => {
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
            let files = settingFiles(req.files);
            let obj = {

            };
            obj = { ...obj, ...files };

            let result = await insertQuery(`${table_name}`, obj);

            return response(req, res, 100, "success", {})
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
            const {
                mid,
                bankCd,
                account,
                name,
                phoneNo,
            } = req.body;
            console.log(req.body)
            let files = settingFiles(req.files);
            let obj = {

            };
            obj = { ...obj, ...files };

            let result = await insertQuery(`${table_name}`, obj);

            return response(req, res, 100, "success", {})
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
            const {
                mid,
                bankCd,
                account,
                name,
                phoneNo,
            } = req.body;
            console.log(req.body)
            let files = settingFiles(req.files);
            let obj = {

            };
            obj = { ...obj, ...files };

            let result = await insertQuery(`${table_name}`, obj);

            return response(req, res, 100, "success", {})
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", false)
        } finally {

        }
    },
};

export default pushCtrl;
