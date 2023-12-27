'use strict';
import { pool } from "../config/db.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { checkDns, checkLevel, response } from "../utils.js/util.js";
import 'dotenv/config';
import t1TrxCtrl from "./push/t1.js";
const trxCtrl = {
    ...t1TrxCtrl,
};

export default trxCtrl;
