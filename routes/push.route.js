import express from 'express';
import { pushCtrl } from '../controllers/index.js';
import pushDoznCtrl from '../controllers/push-dozn.controller.js';
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
//
router
    .route('/dozn/deposit')
    .post(pushDoznCtrl.deposit);
router
    .route('/dozn/withdraw')
    .post(pushDoznCtrl.withdraw);
router
    .route('/dozn/withdraw-fail')
    .post(pushDoznCtrl.withdrawFail);


export default router;