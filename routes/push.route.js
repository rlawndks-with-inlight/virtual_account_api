import express from 'express';
import { pushCtrl } from '../controllers/index.js';
import pushDoznCtrl from '../controllers/push-dozn.controller.js';
import pushPaytusCtrl from '../controllers/push-paytus.controller.js';
import pushCooconCtrl from '../controllers/push-coocon.controller.js';
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
    .route('/dozn/:brand_id')
    .post(pushDoznCtrl.deposit);

router
    .route('/paytus')
    .post(pushPaytusCtrl.deposit);
router
    .route('/coocon')
    .post(pushCooconCtrl.deposit);

export default router;