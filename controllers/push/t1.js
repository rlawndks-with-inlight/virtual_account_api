'use strict';
import { response } from '../../utils.js/util.js';
import 'dotenv/config';
//뱅크너스

const t1TrxCtrl = {
    t1: {
        push: {
            deposit: async (req, res, next) => {
                try {
                    const {
                        tid,
                        trx_tp,
                        trx_stat,
                        trx_amt,
                        guid,
                        bal_tot_amt,
                        vbank_id,
                        vacnt_no,
                        api_sign_val,
                    } = req.body;
                    console.log(req.body);

                    return res.send('0000');
                } catch (err) {
                    console.log(err)
                    return response(req, res, -200, "서버 에러 발생", false)
                } finally {

                }
            },
            withdraw: async (req, res, next) => {
                try {
                    const {
                        tid,
                        trx_tp,
                        trx_stat,
                        trx_amt,
                        guid,
                        api_sign_val
                    } = req.body;


                    return res.send('0000');
                } catch (err) {
                    console.log(err)
                    return response(req, res, -200, "서버 에러 발생", false)
                } finally {

                }
            },
            withdrawFail: async (req, res, next) => {
                try {
                    const { } = req.body;
                    console.log(req.body);


                    return res.send('0000');
                } catch (err) {
                    console.log(err)
                    return response(req, res, -200, "서버 에러 발생", false)
                } finally {

                }
            },
        },
    }
};

export default t1TrxCtrl;