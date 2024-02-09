import express from 'express';
import { depositV1Ctrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1')
    .post(depositV1Ctrl.create)
router
    .route('/v1/phone/request')
    .post(depositV1Ctrl.phone.request)
router
    .route('/v1/phone/check')
    .post(depositV1Ctrl.phone.check)
router
    .route('/v1/account/request')
    .post(depositV1Ctrl.account.request)
router
    .route('/v1/account/check')
    .post(depositV1Ctrl.account.check)

export default router;