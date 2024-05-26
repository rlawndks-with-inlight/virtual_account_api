import crypto from 'crypto';
import util from 'util';
import { pool } from "../config/db.js";
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { readSync } from 'fs';
import when from 'when';
import _ from 'lodash';
import axios from 'axios';
import { getMultipleQueryByWhen, selectQuerySimple, updateQuery } from './query-util.js';
import { getUserDepositFee, getUserWithDrawFee, returnMoment } from './function.js';
import logger from './winston/index.js';
import corpApi from './corp-util/index.js';

const randomBytesPromise = util.promisify(crypto.randomBytes);
const pbkdf2Promise = util.promisify(crypto.pbkdf2);

const createSalt = async () => {
    const buf = await randomBytesPromise(64);
    return buf.toString("base64");
};
export const createHashedPassword = async (password, salt_) => {
    let salt = salt_;
    if (!salt) {
        salt = await createSalt();
    }
    const key = await pbkdf2Promise(password, salt, 104906, 64, "sha512");
    const hashedPassword = key.toString("base64");
    return { hashedPassword, salt };
};
export const makeUserToken = (obj) => {
    let token = jwt.sign({ ...obj },
        process.env.JWT_SECRET,
        {
            expiresIn: '180m',
            issuer: 'fori',
        });
    return token
}
export const checkLevel = (token, level) => { //유저 정보 뿌려주기
    try {
        if (token == undefined)
            return false

        //const decoded = jwt.decode(token)
        const decoded = jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            //console.log(decoded)
            if (err) {
                console.log("token이 변조되었습니다." + err);
                return false
            }
            else return decoded;
        })
        const user_level = decoded.level
        if (level > user_level)
            return false
        else
            return decoded
    }
    catch (err) {
        console.log(err)
        return false
    }
}
export const checkDns = (token) => { //dns 정보 뿌려주기
    try {
        if (token == undefined)
            return false

        //const decoded = jwt.decode(token)
        const decoded = jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            //console.log(decoded)
            if (err) {
                console.log("token이 변조되었습니다." + err);
                return false
            }
            else return decoded;
        })
        const user_level = decoded.level
        if (decoded?.id)
            return decoded
        else
            return false
    }
    catch (err) {
        console.log(err)
        return false
    }
}

const logRequestResponse = async (req, res, decode_user, decode_dns) => {//로그찍기
    try {
        let requestIp = getReqIp(req);

        let request = {
            url: req.originalUrl,
            query: req.query,
            params: req.params,
            body: req.body,
            method: req.method,
            file: req.file || req.files || null
        }
        if (request.url.includes('/logs')) {
            return true;
        }
        request = JSON.stringify(request)
        let user_id = 0;
        if (decode_user && !isNaN(parseInt(decode_user?.id))) {
            user_id = decode_user?.id;
        } else {
            user_id = -1;
        }
        let brand_id = -1;
        if (decode_dns) {
            brand_id = decode_dns?.id;
        } else {
            brand_id = req.body?.brand_id || req.query?.brand_id || req.params?.brand_id || - 1;
        }
        let result = await pool.query(
            "INSERT INTO logs (request, response_data, response_result, response_message, request_ip, user_id, brand_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                request,
                JSON.stringify(res?.data),
                res?.result,
                res?.message,
                requestIp,
                user_id,
                brand_id,
            ]
        )
    } catch (err) {
        console.log(err)
    }

}
export const response = async (req, res, code, message, data) => { //응답 포맷
    var resDict = {
        'result': code,
        'message': message,
        'data': data,
    }
    const decode_user = checkLevel(req.cookies.token, 0)
    const decode_dns = checkLevel(req.cookies.dns, 0)
    let save_log = await logRequestResponse(req, resDict, decode_user, decode_dns);

    res.send(resDict);
}
export const lowLevelException = (req, res) => {
    return response(req, res, -150, "권한이 없습니다.", false);
}
export const isItemBrandIdSameDnsId = (decode_dns, item) => {
    return decode_dns?.id == item?.brand_id
}
export const settingFiles = (obj) => {
    let keys = Object.keys(obj);
    let result = {};
    for (var i = 0; i < keys.length; i++) {
        let file = obj[keys[i]][0];
        if (!file) {
            continue;
        }
        let is_multiple = false;

        if (obj[keys[i]].length > 1) {
            is_multiple = true;
        }
        if (is_multiple) {
            let files = obj[keys[i]];
            result[`${keys[i].split('_file')[0]}_imgs`] = files.map(item => {
                return (process.env.NODE_ENV == 'development' ? process.env.BACK_URL_TEST : process.env.BACK_URL) + '/' + item.destination + item.filename;
            }).join(',')
            files = `[${files}]`;

        } else {
            file.destination = 'files/' + file.destination.split('files/')[1];
            result[`${keys[i].split('_file')[0]}_img`] = (process.env.NODE_ENV == 'development' ? process.env.BACK_URL_TEST : process.env.BACK_URL) + '/' + file.destination + file.filename;
        }
    }
    return result;
}
export const imageFieldList = [
    'logo_file',
    'dark_logo_file',
    'favicon_file',
    'og_file',
    'upload_file',
    'category_file',
    'product_file',
    'profile_file',
    'banner_file',
    'product_banner_file',
    'post_file',

].map(field => {
    return {
        name: field
    }
})
export const makeObjByList = (key, list = []) => {
    let obj = {};
    for (var i = 0; i < list.length; i++) {
        if (!obj[list[i][key]]) {
            obj[list[i][key]] = [];
        }
        obj[list[i][key]].push(list[i]);
    }
    return obj;
}
export const makeChildren = (data_, parent_obj) => {
    let data = data_;
    data.children = parent_obj[data?.id] ?? [];
    if (data.children.length > 0) {
        for (var i = 0; i < data.children.length; i++) {
            data.children[i] = makeChildren(data.children[i], parent_obj);
        }
    } else {
        delete data.children
    }
    return data;
}

export const makeUserTree = (user_list_ = [], decode_user) => {// 유저트리만들기
    let user_list = user_list_;
    let user_parent_obj = makeObjByList('parent_id', user_list);
    let result = [...user_parent_obj[decode_user?.parent_id ?? '-1'] ?? []];
    for (var i = 0; i < result.length; i++) {
        result[i] = makeChildren(result[i], user_parent_obj);
    }
    return result;
}
export const isParentCheckByUsers = (children, parent, user_list, user_obj_) => {//두 유저가 상하위 관계인지
    let user_obj = user_obj_ || makeObjByList('id', user_list);
    let is_parent = false;
    let user = children;
    let parent_id = user?.parent_id;
    while (true) {
        if (parent_id == -1) {
            break;
        }
        if (parent_id == parent?.id) {
            is_parent = true;
            break;
        }
        user = user_obj[parent_id];
        parent_id = user?.parent_id;
    }
    return is_parent;
}

export const makeUserChildrenList = (user_list_ = [], decode_user) => {// 자기 하위 유저들 자기포함 리스트로 불러오기
    let user_list = user_list_;
    let user_parent_obj = makeObjByList('parent_id', user_list);
    let user_obj = makeObjByList('id', user_list);
    let result = [];
    let start_idx = result.length;
    result = [...result, ...user_obj[decode_user?.id]];
    let result_length = result.length;
    while (true) {
        for (var i = start_idx; i < result_length; i++) {
            if (user_parent_obj[result[i]?.id]) {
                result = [...result, ...user_parent_obj[result[i]?.id]];
            }
        }
        start_idx = result_length;
        result_length = result.length;
        if (start_idx == result_length) {
            break;
        }
    }
    return result;
}

export const homeItemsSetting = (column_, products) => {
    let column = column_;

    let item_list = column?.list ?? [];
    item_list = item_list.map(item_id => {
        return { ...item_id, ..._.find(products, { id: parseInt(item_id) }) }
    })
    column.list = item_list;
    return column;
}
export const homeItemsWithCategoriesSetting = (column_, products) => {
    let column = column_;
    for (var i = 0; i < column?.list.length; i++) {
        let item_list = column?.list[i]?.list;
        item_list = item_list.map(item_id => {
            return { ...item_id, ..._.find(products, { id: parseInt(item_id) }) }
        })
        column.list[i].list = item_list;
    }
    return column;
}
export const getReqIp = (req) => {
    let requestIp;
    try {
        requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || '0.0.0.0'
    } catch (err) {
        requestIp = '0.0.0.0'
    }
    requestIp = requestIp.replaceAll('::ffff:', '');
    return requestIp;
}

export const operatorLevelList = [
    { level: 30, num: '5' },
    { level: 25, num: '4' },
    { level: 20, num: '3' },
    { level: 17, num: '2' },
    { level: 15, num: '1' },
    { level: 13, num: '0' },
]
export const getNumberByPercent = (num = 0, percent = 0) => {
    return Math.round(num * (percent).toFixed(3) / 100);
}
export const commarNumber = (num) => {
    if (!num) {
        return 0;
    }
    if (num > 0 && num < 0.000001) {
        return "0.00";
    }
    if (!num && num != 0) {
        return undefined;
    }
    let str = "";
    if (typeof num == "string") {
        str = num;
    } else {
        str = num.toString();
    }

    let decimal = "";
    if (str.includes(".")) {
        decimal = "." + str.split(".")[1].substring(0, 2);
        str = str.split(".")[0];
    } else {
        decimal = "";
    }
    if (str?.length <= 3) {
        return str + decimal;
    }
    let result = "";
    let count = 0;
    for (var i = str?.length - 1; i >= 0; i--) {
        if (count % 3 == 0 && count != 0 && !isNaN(parseInt(str[i]))) result = "," + result;
        result = str[i] + result;
        count++;
    }
    return result + decimal;
}

export const getOperatorList = (brand_) => {
    let operator_list = [];
    let brand = brand_;
    if (typeof brand['level_obj'] == 'string') {
        brand['level_obj'] = JSON.parse(brand?.level_obj ?? '{}');
    }
    for (var i = 0; i < operatorLevelList.length; i++) {
        if (brand['level_obj'][`is_use_sales${operatorLevelList[i].num}`] == 1) {
            operator_list.push({
                value: operatorLevelList[i].level,
                label: brand['level_obj'][`sales${operatorLevelList[i].num}_name`],
                num: operatorLevelList[i].num
            })
        }
    }
    return operator_list;
}

export const getDailyWithdrawAmount = async (user) => {
    let return_moment = returnMoment().substring(0, 10);
    let s_dt = return_moment + ` 00:00:00`;
    let e_dt = return_moment + ` 23:59:59`;
    let sql = `SELECT SUM(mcht_amount) AS withdraw_amount FROM deposits `;
    sql += ` WHERE mcht_id=${user?.id} `;
    sql += ` AND pay_type IN (5, 20) `;
    sql += ` AND created_at >='${s_dt}' AND created_at <='${e_dt}' `;
    let result = await pool.query(sql);
    result = result?.result[0];
    return result;
}
export function findChildIds(data, id) {
    const children = data.filter(item => item.parent_id == id).map(item => item.id);
    children.forEach(child => {
        children.push(...findChildIds(data, child));
    });
    return children;
}
export function findParents(data, item) {
    if (!(item?.parent_id > 0)) {
        return [];
    } else {
        const parent = data.filter(itm => itm.id == item.parent_id);
        return [...findParents(data, parent[0]), ...parent]
    }
}
export const getDnsData = async (dns_data_) => {
    let dns_data = await selectQuerySimple('brands', dns_data_?.id);
    dns_data = dns_data?.result[0];
    dns_data['theme_css'] = JSON.parse(dns_data?.theme_css ?? '{}');
    dns_data['setting_obj'] = JSON.parse(dns_data?.setting_obj ?? '{}');
    dns_data['level_obj'] = JSON.parse(dns_data?.level_obj ?? '{}');
    dns_data['bizppurio_obj'] = JSON.parse(dns_data?.bizppurio_obj ?? '{}');
    dns_data['operator_list'] = getOperatorList(dns_data);

    let brands = await pool.query(`SELECT id, parent_id FROM brands `);
    brands = brands?.result;
    let childrens = findChildIds(brands, dns_data?.id);
    childrens.push(dns_data?.id)
    let parents = findParents(brands, dns_data)
    dns_data['childrens'] = childrens;
    dns_data['parents'] = parents;
    return dns_data;
}
export const insertResponseLog = (req, res) => {
    try {
        let requestIp = getReqIp(req);
        logger.info(JSON.stringify({
            uri: req?.originalUrl,
            body: req?.body,
            query: req?.query,
            params: req?.params,
            ip: requestIp,
            method: req?.method,
            res,

        }));
    } catch (err) {
        console.log(err);
    }
}
export const insertLog = (data, res) => {
    try {
        logger.info(JSON.stringify({
            ...data,
            res,
        }));
    } catch (err) {
        console.log(err);
    }
}
export const getMotherDeposit = async (decode_dns) => {

    let brand_columns = [
        `brands.*`,
        `virtual_accounts.guid`,
        `virtual_accounts.virtual_bank_code`,
        `virtual_accounts.virtual_acct_num`,
        `virtual_accounts.virtual_acct_name`,
        `virtual_accounts.deposit_bank_code AS settle_bank_code`,
        `virtual_accounts.deposit_acct_num AS settle_acct_num`,
        `virtual_accounts.deposit_acct_name AS settle_acct_name`,
    ]
    let brand_sql = `SELECT ${brand_columns.join()} FROM brands `;
    brand_sql += ` LEFT JOIN virtual_accounts ON brands.virtual_account_id=virtual_accounts.id `;
    brand_sql += ` WHERE brands.id=${decode_dns?.id} `;

    let operator_list = getOperatorList(decode_dns);

    let sum_columns = [
        `SUM(CASE WHEN (pay_type=15 OR is_hand=1) THEN 0 ELSE amount END) AS total_amount`,
        `SUM(CASE WHEN withdraw_status=0 THEN withdraw_fee ELSE 0 END) AS total_withdraw_fee`,
        `SUM(deposit_fee) AS total_deposit_fee`,
        `SUM(mcht_amount) AS total_mcht_amount`,
        `SUM(CASE WHEN withdraw_status=0 THEN 0 ELSE mcht_amount END) AS total_attempt_mcht_withdraw_amount`,
        `SUM(CASE WHEN pay_type=25 THEN mcht_amount ELSE 0 END) AS total_manager_mcht_give_amount`,
        `(SELECT SUM(amount) FROM deposits WHERE pay_type=0 AND deposit_status=0 AND brand_id=${decode_dns?.id}) AS total_deposit_amount`,
        `(SELECT COUNT(*) FROM deposits WHERE pay_type=0 AND deposit_status=0 AND brand_id=${decode_dns?.id}) AS total_deposit_count`,
        `(SELECT COUNT(*) FROM deposits WHERE pay_type IN (5, 20) AND withdraw_status=0 AND brand_id=${decode_dns?.id}) AS total_withdraw_count`,
    ]
    for (var i = 0; i < operator_list.length; i++) {
        sum_columns.push(`SUM(sales${operator_list[i].num}_amount) AS total_sales${operator_list[i].num}_amount`);
        sum_columns.push(`SUM(CASE WHEN withdraw_status=0 THEN 0 ELSE sales${operator_list[i].num}_amount END) AS total_attempt_sales${operator_list[i].num}_withdraw_amount`);
        sum_columns.push(`SUM(CASE WHEN pay_type=25 THEN sales${operator_list[i].num}_amount ELSE 0 END) AS total_manager_sales${operator_list[i].num}_give_amount`);
    }
    let sum_sql = `SELECT ${sum_columns.join()} FROM deposits WHERE brand_id=${decode_dns?.id} `;
    let sql_list = [
        { table: 'brand', sql: brand_sql },
        { table: 'sum', sql: sum_sql },
    ]
    let data = await getMultipleQueryByWhen(sql_list);
    data['brand'] = data['brand'][0];
    data['sum'] = data['sum'][0];
    data['sum'].total_oper_amount = 0;
    data['sum'].total_attempt_oper_withdraw_amount = 0;
    data['sum'].total_manager_oper_give_amount = 0;
    for (var i = 0; i < operator_list.length; i++) {
        data['sum'].total_oper_amount += data['sum'][`total_sales${operator_list[i].num}_amount`];
        data['sum'].total_attempt_oper_withdraw_amount += data['sum'][`total_attempt_sales${operator_list[i].num}_withdraw_amount`];
        data['sum'].total_manager_oper_give_amount += data['sum'][`total_manager_sales${operator_list[i].num}_give_amount`];
    }
    let real_amount = {
        data: {},
    }
    if (decode_dns?.parent_id > 0) {
        real_amount.data.amount = data['sum'].total_amount + data['sum'].total_withdraw_fee;
    } else {
        real_amount = await corpApi.balance.info({
            pay_type: 'deposit',
            dns_data: data['brand'],
            decode_user: {},
            guid: data['brand']?.deposit_guid,
        })
    }
    data['real_amount'] = real_amount.data?.amount ?? 0;
    data['childrens'] = [];
    let children_brands = await pool.query(`SELECT * FROM brands WHERE parent_id=${decode_dns?.id}`);
    children_brands = children_brands?.result;
    for (var i = 0; i < children_brands.length; i++) {
        let children_mother_deposit = await getMotherDeposit(children_brands[i]);
        data['childrens'].push(children_mother_deposit);
    }
    data['hold_amount'] = data['brand']?.hold_amount;
    return data;
}

export const setDepositAmountSetting = async (amount = 0, user_ = {}, dns_data = {}) => {
    let user = user_;
    let result = {};
    result['amount'] = amount;
    let operator_list = getOperatorList(dns_data);
    if (user?.level == 10) {
        result['mcht_id'] = user?.id;
        let mcht_columns = [
            `merchandise_columns.mcht_fee`
        ]
        for (var i = 0; i < operator_list.length; i++) {
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_id`);
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_fee`);
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_withdraw_fee`);
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_deposit_fee`);
        }
        let mcht_sql = `SELECT ${mcht_columns.join()} FROM merchandise_columns `
        mcht_sql += ` WHERE mcht_id=${user?.id} `;
        let mcht = await pool.query(mcht_sql);
        mcht = mcht?.result[0];
        user = {
            ...user,
            ...mcht,
        }
        result[`mcht_amount`] = amount - user?.deposit_fee;
        result['deposit_fee'] = user?.deposit_fee;

        if (dns_data?.is_use_fee_operator == 1) {
            let is_use_sales = false;
            let is_first = true;
            let sales_depth_num = -1;
            let minus_fee = dns_data?.head_office_fee;
            result['head_office_fee'] = dns_data?.head_office_fee;
            for (var i = 0; i < operator_list.length; i++) {
                if (user[`sales${operator_list[i]?.num}_id`] > 0) {
                    is_use_sales = true;
                    if (is_first) {
                        result[`head_office_amount`] = result[`head_office_amount`] ?? 0;
                        result[`head_office_amount`] += getNumberByPercent(amount, user[`sales${operator_list[i]?.num}_fee`] - minus_fee)
                    }
                    is_first = false;
                } else {
                    continue;
                }
                if (sales_depth_num >= 0) {
                    result[`sales${sales_depth_num}_amount`] = result[`sales${sales_depth_num}_amount`] ?? 0;
                    result[`sales${sales_depth_num}_amount`] += getNumberByPercent(amount, user[`sales${operator_list[i]?.num}_fee`] - minus_fee)
                }
                result[`sales${operator_list[i]?.num}_id`] = user[`sales${operator_list[i]?.num}_id`];
                result[`sales${operator_list[i]?.num}_fee`] = user[`sales${operator_list[i]?.num}_fee`];
                minus_fee = result[`sales${operator_list[i]?.num}_fee`];
                sales_depth_num = operator_list[i]?.num;
            }
            if (!is_use_sales) {
                result[`head_office_amount`] = result[`head_office_amount`] ?? 0;
                result[`head_office_amount`] += getNumberByPercent(amount, user[`mcht_fee`] - minus_fee);
            } else {
                result[`sales${sales_depth_num}_amount`] = result[`sales${sales_depth_num}_amount`] ?? 0;
                result[`sales${sales_depth_num}_amount`] += getNumberByPercent(amount, user[`mcht_fee`] - minus_fee);
            }
            result[`mcht_fee`] = user[`mcht_fee`];
            result[`mcht_amount`] -= getNumberByPercent(amount, user[`mcht_fee`]);
        }
        if (dns_data?.is_use_deposit_operator == 1) {
            result['head_office_amount'] = result['head_office_amount'] ?? 0;
            result['head_office_amount'] += parseFloat(getUserDepositFee(user, 40, operator_list, dns_data?.deposit_head_office_fee));
            for (var i = 0; i < operator_list.length; i++) {
                if (user[`sales${operator_list[i].num}_id`] > 0) {
                    result[`sales${operator_list[i].num}_amount`] = result[`sales${operator_list[i].num}_amount`] ?? 0;
                    result[`sales${operator_list[i].num}_amount`] += parseFloat(getUserDepositFee(user, operator_list[i].value, operator_list, dns_data?.deposit_head_office_fee));
                    result[`sales${operator_list[i].num}_id`] = user[`sales${operator_list[i].num}_id`];
                }
            }
        }

        return result;
    } else {
        for (var i = 0; i < operator_list.length; i++) {
            if (operator_list[i]?.value == user?.level) {
                result[`sales${operator_list[i].num}_id`] = user?.id;
                break;
            }
        }
        return result;
    }
}

export const setWithdrawAmountSetting = async (amount_ = 0, user_ = {}, dns_data = {}) => {
    let amount = parseInt(amount_);
    let user = user_;
    let result = {};
    let operator_list = getOperatorList(dns_data);
    result['amount'] = (-1) * (parseInt(amount) + parseInt(user?.withdraw_fee));
    result['expect_amount'] = result['amount'];
    result['withdraw_fee'] = user?.withdraw_fee;
    if (user?.level == 10) {
        let mcht_columns = [
            `merchandise_columns.mcht_fee`
        ]
        for (var i = 0; i < operator_list.length; i++) {
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_id`);
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_fee`);
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_withdraw_fee`);
            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_deposit_fee`);
        }
        let mcht_sql = `SELECT ${mcht_columns.join()} FROM merchandise_columns `
        mcht_sql += ` WHERE mcht_id=${user?.id} `;
        let mcht = await pool.query(mcht_sql);
        mcht = mcht?.result[0];
        user = {
            ...user,
            ...mcht,
        }
        console.log(user)
        result['mcht_amount'] = (-1) * (amount + user?.withdraw_fee);
        result['mcht_id'] = user?.id;
        if (dns_data?.is_use_withdraw_operator == 1) {
            result['head_office_amount'] = result['head_office_amount'] ?? 0;
            result['head_office_amount'] = parseFloat(getUserWithDrawFee(user, 40, operator_list, dns_data?.withdraw_head_office_fee));
            for (var i = 0; i < operator_list.length; i++) {
                if (user[`sales${operator_list[i].num}_id`] > 0) {
                    result[`sales${operator_list[i].num}_amount`] = result[`sales${operator_list[i].num}_amount`] ?? 0;
                    result[`sales${operator_list[i].num}_amount`] = parseFloat(getUserWithDrawFee(user, operator_list[i].value, operator_list, dns_data?.withdraw_head_office_fee));
                    result[`sales${operator_list[i].num}_id`] = user[`sales${operator_list[i].num}_id`];
                }
            }
        }
        return result;
    } else {
        for (var i = 0; i < operator_list.length; i++) {
            if (operator_list[i]?.value == user?.level) {
                result[`sales${operator_list[i].num}_id`] = user?.id;
                result[`sales${operator_list[i].num}_amount`] = (-1) * (amount + user?.withdraw_fee);
                break;
            }
        }
        return result;
    }
}
export function generateRandomString(length = 1) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;
}
export const findBlackList = async (word, type, decode_dns = {}) => {
    try {
        let black_item = await pool.query(`SELECT * FROM black_lists WHERE is_delete=0 AND acct_num=? AND brand_id=${decode_dns?.id}`, [word]);
        return black_item?.result[0];

    } catch (err) {
        console.log(err);
    }
}