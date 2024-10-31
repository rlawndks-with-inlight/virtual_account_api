import express from 'express';
import { pushCtrl } from '../controllers/index.js';
import pushPaytusCtrl from '../controllers/push-paytus.controller.js';
import pushCooconCtrl from '../controllers/push-coocon.controller.js';
import pushKoreaPaySystemCtrl from '../controllers/push-korea-pay-system.js';
import pushPopbillCtrl from '../controllers/push-popbill.controller.js';
import pushHectoCtrl from '../controllers/push-hecto.controller.js';
import pushIcbCtrl from '../controllers/push-icb.controller.js';
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
    .route('/popbill/:brand_id')
    .post(pushPopbillCtrl.deposit);

//페이투스
router
    .route('/paytus')
    .post(pushPaytusCtrl.deposit);
//쿠콘
router
    .route('/coocon')
    .post(pushCooconCtrl.deposit);
//헥토
router
    .route('/hecto')
    .post(pushHectoCtrl.deposit);
//코리아결제시스템
router
    .route('/korea-pay-system/issue')
    .post(pushKoreaPaySystemCtrl.issue);
router
    .route('/korea-pay-system/deposit')
    .post(pushKoreaPaySystemCtrl.deposit);
router
    .route('/korea-pay-system/withdraw')
    .post(pushKoreaPaySystemCtrl.withdraw);
//icb
router
    .route('/icb')
    .post(pushIcbCtrl.deposit);

export default router;