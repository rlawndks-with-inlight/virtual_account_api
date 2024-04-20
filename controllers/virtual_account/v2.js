import { pool } from "../../config/db.js";
import corpApi from "../../utils.js/corp-util/index.js";
import { insertQuery, updateQuery } from "../../utils.js/query-util.js";
import { checkDns, checkLevel, findBlackList, getDnsData, response } from "../../utils.js/util.js";

//페이투스활용api
const virtualAccountV2Ctrl = {
    account: {
        request: async (req_, res, next) => {// 1원인증
            let req = req_;
            try {

                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    bank_code,
                    account,
                    name,
                } = req.body;

                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
                }
                req.body.brand_id = brand?.id;
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }
                let black_item = await findBlackList(account, 0, brand);
                if (black_item) {
                    return response(req, res, -100, "블랙리스트 유저입니다.", {});
                }
                let data = {};
                let api_result = await corpApi.user.account({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    deposit_bank_code: bank_code,
                    deposit_acct_num: account,
                    deposit_acct_name: name,
                })
                if (api_result?.code == 100) {
                    let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE verify_tr_dt=? AND verify_tr_no=? AND is_delete=0 `, [
                        api_result.data?.verify_tr_dt,
                        api_result.data?.verify_tr_no,
                    ])
                    virtual_account = virtual_account?.result[0];
                    if (!virtual_account) {
                        let result = await insertQuery(`virtual_accounts`, {
                            brand_id: brand?.id,
                            mcht_id: mcht?.id,
                            deposit_bank_code: bank_code,
                            deposit_acct_num: account,
                            deposit_acct_name: name,
                            status: 5,
                            deposit_acct_check: 0,
                            verify_tr_no: api_result.data?.verify_tr_no,
                            verify_tr_dt: api_result.data?.verify_tr_dt,
                            ci: `${api_result.data?.verify_tr_no}${new Date().getTime()}`,
                        })
                    }
                    data['verify_tr_no'] = api_result.data?.verify_tr_no;
                    data['verify_tr_dt'] = api_result.data?.verify_tr_dt;
                } else {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
                }
                return response(req, res, 100, "success", data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req, res, next) => {// 1원인증확인
            try {

                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    vrf_word,
                    verify_tr_no,
                    verify_tr_dt,
                } = req.body;

                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
                }
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }
                let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE verify_tr_dt=? AND verify_tr_no=? AND is_delete=0`, [
                    verify_tr_dt,
                    verify_tr_no,
                ])
                virtual_account = virtual_account?.result[0];
                if (!virtual_account) {
                    return response(req, res, -100, "1원인증 발송을 해주세요.", {});
                }
                let data = {};
                let api_result = await corpApi.user.account_verify({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    verify_tr_dt: verify_tr_dt,
                    verify_tr_no: verify_tr_no,
                    vrf_word: vrf_word,
                })
                if (api_result?.code == 100) {
                    let result = updateQuery(`virtual_accounts`, {
                        deposit_acct_check: 1,
                    }, virtual_account?.id);
                    /*
                    let result = await insertQuery(`virtual_accounts`, {
                        brand_id: brand?.id,
                        mcht_id: mcht?.id,
                        deposit_bank_code: bank_code,
                        deposit_acct_num: account,
                        deposit_acct_name: name,
                        status: 5,
                    })
                    */
                    data['is_check'] = 1;
                } else {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
                }
                return response(req, res, 100, "success", data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    },
    sms: {
        send: async (req, res, next) => {// sms발송
            try {

                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    gender,
                    ntv_frnr,
                    birth,
                    tel_com,
                    phone_num,
                    verify_tr_dt,
                    verify_tr_no,
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
                }

                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }

                let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE verify_tr_dt=? AND verify_tr_no=? AND is_delete=0`, [
                    verify_tr_dt,
                    verify_tr_no,
                ])
                virtual_account = (virtual_account?.result[0] ?? {});
                if (virtual_account?.deposit_acct_check != 1) {
                    return response(req, res, -100, "1원인증을 우선 완료해 주세요.", {});
                }
                let data = {};
                let api_result = await corpApi.user.check_real_name({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    deposit_bank_code: virtual_account?.deposit_bank_code,
                    deposit_acct_num: virtual_account?.deposit_acct_num,
                    deposit_acct_name: virtual_account?.deposit_acct_name,
                    auth_num: birth.substring(2, birth.length),
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
                }

                let api_result2 = await corpApi.sms.push({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    deposit_acct_name: virtual_account?.deposit_acct_name,
                    auth_num: birth,
                    gender,
                    ntv_frnr,
                    tel_com,
                    phone_num,
                })
                if (api_result2?.code != 100) {
                    return response(req, res, -100, (api_result2?.message || "서버 에러 발생"), data)
                }
                data['tx_seq_no'] = api_result2.data?.tx_seq_no;
                let result = updateQuery(`virtual_accounts`, {
                    birth: birth,
                    gender,
                    ntv_frnr,
                    tel_com,
                    phone_num,
                }, virtual_account?.id);

                return response(req, res, 100, "success", data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req, res, next) => {//  sms확인
            try {

                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    tx_seq_no,
                    verify_tr_dt,
                    verify_tr_no,
                    phone_vrf_word,
                } = req.body;
                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }
                brand = await getDnsData(brand);
                if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                    return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
                }
                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }
                let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE verify_tr_dt=? AND verify_tr_no=? AND is_delete=0`, [
                    verify_tr_dt,
                    verify_tr_no,
                ])
                virtual_account = (virtual_account?.result[0] ?? {});
                if (virtual_account?.deposit_acct_check != 1) {
                    return response(req, res, -100, "1원인증을 우선 완료해 주세요.", {});
                }

                let data = {};
                let api_result = await corpApi.sms.check({
                    pay_type: 'deposit',
                    dns_data: brand,
                    decode_user: mcht,
                    tx_seq_no,
                    phone_num: virtual_account?.phone_num,
                    vrf_word: phone_vrf_word,
                })
                if (api_result?.code != 100) {
                    return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
                }
                data['is_check'] = 1;
                return response(req, res, 100, "success", data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    },
    issuance: async (req, res, next) => {//발급
        try {

            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                api_key,
                mid,
                verify_tr_dt,
                verify_tr_no,
            } = req.body;

            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand?.result[0];
            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }
            brand = await getDnsData(brand);
            if (brand?.setting_obj?.is_virtual_acct_inspect == 1) {
                return response(req, res, -100, "점검중입니다. 본사에게 문의하세요", {});
            }
            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                mcht = {
                    id: 0,
                }
            }
            let virtual_account = await pool.query(`SELECT * FROM virtual_accounts WHERE verify_tr_dt=? AND verify_tr_no=? AND is_delete=0`, [
                verify_tr_dt,
                verify_tr_no,
            ])
            virtual_account = (virtual_account?.result[0] ?? {});
            if (virtual_account?.deposit_acct_check != 1) {
                return response(req, res, -100, "1원인증을 우선 완료해 주세요.", {});
            }

            let data = {};
            let api_result = await corpApi.vaccount({
                pay_type: 'deposit',
                dns_data: brand,
                decode_user: mcht,
                deposit_bank_code: virtual_account?.deposit_bank_code,
                deposit_acct_num: virtual_account?.deposit_acct_num,
                deposit_acct_name: virtual_account?.deposit_acct_name,
                phone_num: virtual_account?.phone_num,
                birth: virtual_account?.birth,
            })
            if (api_result?.code != 100) {
                return response(req, res, -100, (api_result?.message || "서버 에러 발생"), data)
            }
            let result = updateQuery(`virtual_accounts`, {
                virtual_bank_code: api_result.data?.bank_code,
                virtual_acct_num: api_result.data?.acct_num,
                status: 0,
            }, virtual_account?.id);
            data['is_issuance'] = 1;
            data['bank_code'] = api_result.data?.bank_code;
            data['virtual_acct_num'] = api_result.data?.acct_num;
            data['ci'] = virtual_account?.ci;
            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
}

export default virtualAccountV2Ctrl;
