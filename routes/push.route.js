import express from 'express';
import { pushCtrl } from '../controllers/index.js';
import pushDoznCtrl from '../controllers/push-dozn.controller.js';
import pushPaytusCtrl from '../controllers/push-paytus.controller.js';
import pushCooconCtrl from '../controllers/push-coocon.controller.js';
import pushKoreaPaySystemCtrl from '../controllers/push-korea-pay-system.js';
const router = express.Router(); // eslint-disable-line new-cap

//뱅크너스
router
    .route('/deposit')
    .post(pushCtrl.deposit);
router
    .route('/withdraw')
    .post(pushCtrl.withdraw);
router
    .route('/withdraw-fail')
    .post(pushCtrl.withdrawFail);
//더즌
router
    .route('/dozn/:brand_id')
    .post(pushDoznCtrl.deposit);

//페이투스
router
    .route('/paytus')
    .post(pushPaytusCtrl.deposit);
//쿠콘
router
    .route('/coocon')
    .post(pushCooconCtrl.deposit);
//코리아결제시스템
router
    .route('/korea-pay-system/deposit')
    .post(pushKoreaPaySystemCtrl.deposit);
router
    .route('/korea-pay-system/withdraw')
    .post(pushKoreaPaySystemCtrl.withdraw);

export default router;