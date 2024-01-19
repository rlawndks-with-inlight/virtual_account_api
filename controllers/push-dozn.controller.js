'use strict';
import { pool } from "../config/db.js";
import corpApi from "../utils.js/corp-util/index.js";
import { checkIsManagerUrl } from "../utils.js/function.js";
import { insertQuery, updateQuery } from "../utils.js/query-util.js";
import { checkDns, checkLevel, getNumberByPercent, getOperatorList, response, sendNotiPush } from "../utils.js/util.js";
import 'dotenv/config';

//노티 받기

const pushDoznCtrl = {
    deposit: async (req, res, next) => {
        try {
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const { brand_id } = req.params;
            const {
                list = [],

            } = req.body;
            for (var i = 0; i < list.length; i++) {
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
                } = list[i];
                console.log(req.body)
                let dns_data = await pool.query(`SELECT * FROM brands WHERE id=?`, [brand_id]);
                dns_data = dns_data?.result[0];

                let operator_list = getOperatorList(dns_data);

                if (depositAmnt > 0) {
                    let amount = parseInt(depositAmnt);

                    let obj = {
                        amount: amount,
                        head_office_fee: dns_data?.deposit_head_office_fee,
                        corp_account_balance: balance,
                        deposit_status: 0,
                        trx_id: tranNum,
                    };
                    let deposit = await pool.query(`SELECT * FROM deposits WHERE pay_type=0 AND brand_id=${dns_data?.id} AND expect_amount=? AND deposit_acct_name=? AND deposit_status=5 `, [
                        amount,
                        tranName
                    ])
                    deposit = deposit?.result[0];
                    if (deposit) {
                        let mcht_columns = [
                            `users.*`,
                            `merchandise_columns.mcht_fee`,
                        ]
                        for (var i = 0; i < operator_list.length; i++) {
                            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_id`);
                            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_fee`);
                            mcht_columns.push(`merchandise_columns.sales${operator_list[i]?.num}_withdraw_fee`);
                        }
                        let sql = `SELECT ${mcht_columns.join()} FROM users `;
                        sql += ` LEFT JOIN merchandise_columns ON merchandise_columns.mcht_id=users.id `;
                        sql += ` WHERE users.id=${deposit?.mcht_id} `;
                        let mcht = await pool.query(sql);
                        mcht = mcht?.result[0];
                        let is_use_sales = false;
                        let is_first = true;
                        let sales_depth_num = -1;
                        let minus_fee = dns_data?.deposit_head_office_fee;
                        for (var i = 0; i < operator_list.length; i++) {
                            if (mcht[`sales${operator_list[i]?.num}_id`] > 0) {
                                is_use_sales = true;
                                if (is_first) {
                                    obj[`head_office_amount`] = getNumberByPercent(amount, mcht[`sales${operator_list[i]?.num}_fee`] - minus_fee)
                                }
                                is_first = false;
                            } else {
                                continue;
                            }
                            if (sales_depth_num >= 0) {
                                obj[`sales${sales_depth_num}_amount`] = getNumberByPercent(amount, mcht[`sales${operator_list[i]?.num}_fee`] - minus_fee)
                            }
                            obj[`sales${operator_list[i]?.num}_id`] = mcht[`sales${operator_list[i]?.num}_id`];
                            obj[`sales${operator_list[i]?.num}_fee`] = mcht[`sales${operator_list[i]?.num}_fee`];
                            minus_fee = obj[`sales${operator_list[i]?.num}_fee`];
                            sales_depth_num = operator_list[i]?.num;
                        }
                        if (!is_use_sales) {
                            obj[`head_office_amount`] = getNumberByPercent(amount, mcht[`mcht_fee`] - minus_fee);
                        } else {
                            obj[`sales${sales_depth_num}_amount`] = getNumberByPercent(amount, mcht[`mcht_fee`] - minus_fee);
                        }
                        obj[`mcht_fee`] = mcht[`mcht_fee`];
                        obj[`mcht_amount`] = getNumberByPercent(amount, 100 - mcht[`mcht_fee`]) - (mcht?.deposit_fee ?? 0);
                        if (mcht[`deposit_noti_url`]) {
                            obj[`deposit_noti_status`] = 5;
                            obj[`deposit_noti_obj`] = JSON.stringify({
                                amount,
                                bank_code: deposit?.deposit_bank_code,
                                acct_num: deposit?.deposit_acct_num,
                                acct_name: deposit?.deposit_acct_name,
                            });
                        }
                        let result = await updateQuery(`deposits`, obj, deposit?.id);

                    } else {
                        delete obj['head_office_fee'];
                        obj['expect_amount'] = amount;
                        obj['deposit_acct_num'] = recvAccntNo;
                        obj['deposit_acct_name'] = tranName;
                        obj['deposit_status'] = 10;
                        obj['brand_id'] = dns_data?.id;
                        let result = await insertQuery(`deposits`, obj);
                    }
                } else if (withdrawAmnt > 0) {

                }
            }

            return res.send('0000');

        } catch (err) {
            console.log(err)
            return res.send('9999');
        } finally {

        }
    },
};

export default pushDoznCtrl;
