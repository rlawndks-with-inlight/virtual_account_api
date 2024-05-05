import rateLimit from 'express-rate-limit';
import { getReqIp } from '../util.js';

let confirm_ip_list = [
    '211.45.163.4'
]
const limiter = rateLimit({
    windowMs: 1000 * 60, //1초 ... 15 * 60 * 1000 15분
    max: 100,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        rate_limiter: 1
    },
    handler: function (req, res) {
        let ip = getReqIp(req);
        if (!confirm_ip_list.includes(ip)) {
            res.status(429).send({
                rate_limiter: 1
            });
        }
    }
});

export {
    limiter
}