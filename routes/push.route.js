import express from 'express';
import { pushCtrl } from '../controllers/index.js';
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


export default router;