import express from 'express';
import { trxCtrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/push/deposit')
    .post(trxCtrl.push.deposit);
router
    .route('/push/withdraw')
    .post(trxCtrl.push.withdraw);
router
    .route('/push/withdraw-fail')
    .post(trxCtrl.push.withdrawFail);


export default router;