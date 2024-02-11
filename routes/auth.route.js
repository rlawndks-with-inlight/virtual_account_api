import express from 'express';
import { authV1Ctrl } from '../controllers/index.js';

const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1/phone/request')
    .post(authV1Ctrl.phone.request)
router
    .route('/v1/phone/check')
    .post(authV1Ctrl.phone.check)
router
    .route('/v1/account/request')
    .post(authV1Ctrl.account.request)
router
    .route('/v1/account/check')
    .post(authV1Ctrl.account.check)

export default router;