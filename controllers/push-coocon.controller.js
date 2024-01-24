'use strict';
import { pool } from "../config/db.js";
import 'dotenv/config';
import { insertQuery } from '../utils.js/query-util.js'
import corpApi from "../utils.js/corp-util/index.js";
//노티 받기
const pushCooconCtrl = {
    deposit: async (req, res, next) => {
        try {
            const { brand_id } = req.params;
            const {
                plain_text
            } = req.body;
            let text = Buffer.from(plain_text, "base64").toString('utf8');
            console.log(text)
            let data = makeDataObj(text);
            let {
                length,
                date,
                time,
                category,
                trx_code,
                corp_code,
                bank_code,
                virtual_bank_code,
                virtual_acct_num,
                receiver,
                sender,
                amount,
                func_type,
                deposit_bank_code,
                deposit_acct_num,
            } = data;
            console.log(data);
            if (trx_code == '1300') {
                let dns_data = await pool.query(`SELECT * FROM brands WHERE withdraw_trt_inst_code=? AND withdraw_virtual_acct_num=?`, [
                    corp_code,
                    virtual_acct_num
                ]);
                dns_data = dns_data?.result[0];
                let insert_obj = {
                    brand_id: dns_data?.id,
                    amount: amount,
                    expect_amount: amount,
                    pay_type: 0,
                    expect_amount: amount,
                    deposit_bank_code: deposit_bank_code,
                    deposit_acct_num: deposit_acct_num,
                    deposit_acct_name: sender,
                    virtual_bank_code: virtual_bank_code,
                    virtual_acct_num: virtual_acct_num,
                    virtual_acct_name: receiver,
                    trx_id: date + time + amount + `${Math.random().toString(16).substring(2, 8)}`,
                    is_type_withdraw_acct: 1,
                }
                let get_balance = await corpApi.balance.info({
                    pay_type: 'withdraw',
                    dns_data: dns_data,
                    decode_user: {},
                })
                console.log(get_balance)
                let result = await insertQuery(`deposits`, insert_obj);

            }

            return res.send('0000');

        } catch (err) {
            console.log(err)
            return res.send('9999');
        } finally {

        }
    },
};

const makeDataObj = (text_) => {
    let sub_string_list = [
        { s: 0, e: 4, key_name: 'length', },
        { s: 4, e: 8, key_name: 'date', },
        { s: 12, e: 6, key_name: 'time', },
        { s: 30, e: 4, key_name: 'category', },
        { s: 34, e: 4, key_name: 'trx_code', },
        { s: 42, e: 8, key_name: 'corp_code', },
        { s: 55, e: 2, key_name: 'bank_code', },
        { s: 63, e: 3, key_name: 'virtual_bank_code', },
        { s: 100, e: 16, key_name: 'virtual_acct_num', },
        { s: 116, e: 30, key_name: 'receiver', },
        { s: 146, e: 30, key_name: 'sender', },
        { s: 218, e: 12, key_name: 'amount', },
        { s: 327, e: 12, key_name: 'num', },
        { s: 339, e: 1, key_name: 'func_type', },
        { s: 340, e: 3, key_name: 'deposit_bank_code', },
        { s: 343, e: 16, key_name: 'deposit_acct_num', },
        { s: 375, e: 20, key_name: 'customer_num', },
    ]
    let text = text_;
    const korean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
    let text_split = text.split('');
    for (var i = 0; i < text_split.length; i++) {
        let is_korean = korean.test(text_split[i]);
        if (is_korean) {
            text_split[i] = text_split[i] + '@';
        }
    }
    text = text_split.join('');
    let data_obj = {};
    for (var i = 0; i < sub_string_list.length; i++) {
        data_obj[sub_string_list[i].key_name] = text.substring(sub_string_list[i].s, sub_string_list[i].s + sub_string_list[i].e);
    }
    for (var i = 0; i < Object.keys(data_obj).length; i++) {
        let key = Object.keys(data_obj)[i];
        data_obj[key] = data_obj[key].replaceAll('@', '').replaceAll(' ', '');
    }
    return data_obj;
}
export default pushCooconCtrl;
