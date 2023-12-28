import express from 'express';
import { virtualAccountV1Ctrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

//v1
router
    .route('/v1/')
    .post(virtualAccountV1Ctrl.request)
router
    .route('/v1/check')
    .post(virtualAccountV1Ctrl.check)
router
    .route('/v1/issuance')
    .post(virtualAccountV1Ctrl.issuance)


export default router;