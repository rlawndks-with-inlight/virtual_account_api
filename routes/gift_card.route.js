import express from 'express';
import giftCardV1Ctrl from '../controllers/gift_card/v1.js';

const router = express.Router(); // eslint-disable-line new-cap

//v1
router
    .route('/v1/phone/request')
    .post(giftCardV1Ctrl.phone.request);
router
    .route('/v1/phone/check')
    .post(giftCardV1Ctrl.phone.check);
router
    .route('/v1/acct/request')
    .post(giftCardV1Ctrl.acct.request);
router
    .route('/v1/acct/check')
    .post(giftCardV1Ctrl.acct.check);
router
    .route('/v1/gift/order')
    .post(giftCardV1Ctrl.gift.order);
router
    .route('/v1/gift/auth')
    .post(giftCardV1Ctrl.gift.auth);
router
    .route('/v1/gift/use')
    .post(giftCardV1Ctrl.gift.use);

export default router;