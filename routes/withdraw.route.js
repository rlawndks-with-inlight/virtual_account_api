import express from 'express';
import { withdrawV1Ctrl } from '../controllers/index.js';
import withdrawV2Ctrl from '../controllers/withdraw/v2.js';
import withdrawV3Ctrl from '../controllers/withdraw/v3.js';
import withdrawV4Ctrl from '../controllers/withdraw/v4.js';
const router = express.Router(); // eslint-disable-line new-cap

//쿠콘
router
    .route('/v1')
    .post(withdrawV1Ctrl.request)
router
    .route('/v1/check')
    .post(withdrawV1Ctrl.check)
router
    .route('/v1/withdraw/check')
    .post(withdrawV1Ctrl.check_withdraw)
//뱅크너스
router
    .route('/v2')
    .post(withdrawV2Ctrl.request);
//코리아결제시스템
router
    .route('/v3')
    .post(withdrawV3Ctrl.request);
router
    .route('/v4')
    .post(withdrawV4Ctrl.request);

export default router;