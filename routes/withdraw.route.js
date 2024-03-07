import express from 'express';
import { withdrawV1Ctrl } from '../controllers/index.js';
import withdrawV2Ctrl from '../controllers/withdraw/v2.js';
import withdrawV3Ctrl from '../controllers/withdraw/v3.js';
const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1')
    .post(withdrawV1Ctrl.request)
router
    .route('/v1/check')
    .post(withdrawV1Ctrl.check)
router
    .route('/v1/withdraw/check')
    .post(withdrawV1Ctrl.check_withdraw)

router
    .route('/v2')
    .post(withdrawV2Ctrl.request);
router
    .route('/v3')
    .post(withdrawV3Ctrl.request);
router
    .route('/v3/check')
    .post(withdrawV3Ctrl.check);
export default router;