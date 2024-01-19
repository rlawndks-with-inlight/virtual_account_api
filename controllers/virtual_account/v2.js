
const virtualAccountV2Ctrl = {

    account: {
        request: async (req, res, next) => {// 1원인증
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    tid,
                    vrf_word,
                    guid,
                } = req.body;

                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }

                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }

                let data = {};


                return response(req, res, 100, "success", data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req, res, next) => {// 1원인증확인
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    tid,
                    vrf_word,
                    guid,
                } = req.body;

                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }

                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }

                let data = {};


                return response(req, res, 100, "success", data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
    },
    sms: {
        send: async (req, res, next) => {// 1원인증확인
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    tid,
                    vrf_word,
                    guid,
                } = req.body;

                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }

                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }

                let data = {};


                return response(req, res, 100, "success", data)
            } catch (err) {
                console.log(err)
                return response(req, res, -200, "서버 에러 발생", false)
            } finally {

            }
        },
        check: async (req, res, next) => {// 1원인증확인
            try {
                let is_manager = await checkIsManagerUrl(req);
                const decode_user = checkLevel(req.cookies.token, 0);
                const decode_dns = checkDns(req.cookies.dns);
                const {
                    api_key,
                    mid,
                    tid,
                    vrf_word,
                    guid,
                } = req.body;

                if (!api_key) {
                    return response(req, res, -100, "api key를 입력해주세요.", {});
                }
                let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
                brand = brand?.result[0];
                if (!brand) {
                    return response(req, res, -100, "api key가 잘못되었습니다.", {});
                }

                let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
                mcht = mcht?.result[0];
                if (!mcht) {
                    mcht = {
                        id: 0,
                    }
                }

                let data = {};


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
            let is_manager = await checkIsManagerUrl(req);
            const decode_user = checkLevel(req.cookies.token, 0);
            const decode_dns = checkDns(req.cookies.dns);
            const {
                api_key,
                mid,
                tid,
                vrf_word,
                guid,
            } = req.body;

            if (!api_key) {
                return response(req, res, -100, "api key를 입력해주세요.", {});
            }
            let brand = await pool.query(`SELECT * FROM brands WHERE api_key=?`, [api_key]);
            brand = brand?.result[0];
            if (!brand) {
                return response(req, res, -100, "api key가 잘못되었습니다.", {});
            }

            let mcht = await pool.query(`SELECT * FROM users WHERE mid=? AND level=10`, [mid]);
            mcht = mcht?.result[0];
            if (!mcht) {
                mcht = {
                    id: 0,
                }
            }

            let data = {};

            return response(req, res, 100, "success", data)
        } catch (err) {
            console.log(err)
            return response(req, res, -200, "서버 에러 발생", {})
        } finally {

        }
    },
}

export default virtualAccountV2Ctrl;
