import express from 'express';
import { virtualAccountV1Ctrl } from '../controllers/index.js';
import virtualAccountV2Ctrl from '../controllers/virtual_account/v2.js';
import virtualAccountV3Ctrl from '../controllers/virtual_account/v3.js';
import virtualAccountV4Ctrl from '../controllers/virtual_account/v4.js';
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
router
    .route('/v3')
    .post(virtualAccountV3Ctrl.request)
router
    .route('/v3/check')
    .post(virtualAccountV3Ctrl.check)
//
router
    .route('/v4/phone/request')
    .post(virtualAccountV4Ctrl.phone.request)
router
    .route('/v4/phone/check')
    .post(virtualAccountV4Ctrl.phone.check)
router
    .route('/v4/request')
    .post(virtualAccountV4Ctrl.acct.request)
router
    .route('/v4/check')
    .post(virtualAccountV4Ctrl.acct.check)
router
    .route('/v4/issuance')
    .post(virtualAccountV4Ctrl.issuance)

export default router;