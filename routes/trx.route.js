import express from 'express';
import { trxCtrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

//뱅크너스
router
    .route('/t1/push/deposit')
    .post(trxCtrl.t1.push.deposit);
router
    .route('/t1/push/withdraw')
    .post(trxCtrl.t1.push.withdraw);
router
    .route('/t1/push/withdraw-fail')
    .post(trxCtrl.t1.push.withdrawFail);


export default router;