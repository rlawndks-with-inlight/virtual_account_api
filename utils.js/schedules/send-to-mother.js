import _ from "lodash";
import { pool } from "../../config/db.js"
import corpApi from "../corp-util/index.js";

export const sendToMother = async () => {
    try {
        let virtual_accounts = await pool.query(`SELECT * FROM virtual_accounts WHERE deposit_acct_check=1 AND status=0 `);
        virtual_accounts = virtual_accounts?.result;
        let brands = await pool.query(`SELECT * FROM brands `);
        brands = brands?.result;
        console.log(123)
        for (var i = 0; i < virtual_accounts.length; i++) {
            let amount_info = await corpApi.balance.info({
                pay_type: 'deposit',
                dns_data: _.find(brands, { id: parseInt(virtual_accounts[i]?.brand_id) }),
                decode_user: {},
                guid: virtual_accounts[i]?.guid,
            })
            console.log(amount_info)
            if (amount_info.code > 0) {
                if (amount_info.data?.amount > 0) {
                    let mother_to_result = await corpApi.mother.to({
                        pay_type: 'deposit',
                        dns_data: _.find(brands, { id: parseInt(virtual_accounts[i]?.brand_id) }),
                        decode_user: {},
                        guid: virtual_accounts[i]?.guid,
                        amount: amount_info.data?.amount
                    })
                    console.log(mother_to_result);
                }
            }
        }
    } catch (err) {
        console.log(err)
    }
}