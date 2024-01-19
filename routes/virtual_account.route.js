import express from 'express';
import { virtualAccountV1Ctrl } from '../controllers/index.js';
import virtualAccountV2Ctrl from '../controllers/virtual_account/v2.js';
const router = express.Router(); // eslint-disable-line new-cap

//v1
router
    .route('/v1')
    .post(virtualAccountV1Ctrl.request)
router
    .route('/v1/check')
    .post(virtualAccountV1Ctrl.check)
router
    .route('/v1/issuance')
    .post(virtualAccountV1Ctrl.issuance)
//v2
router
    .route('/v2/account')
    .post(virtualAccountV2Ctrl.account.request)
router
    .route('/v2/account/check')
    .post(virtualAccountV2Ctrl.account.check)
router
    .route('/v2/sms')
    .post(virtualAccountV2Ctrl.sms.send)
router
    .route('/v2/sms/check')
    .post(virtualAccountV2Ctrl.sms.check)
router
    .route('/v2/issuance')
    .post(virtualAccountV2Ctrl.issuance)
//

export default router;