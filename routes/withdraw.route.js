import express from 'express';
import { withdrawV1Ctrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1')
    .post(withdrawV1Ctrl.request)
router
    .route('/v1/check')
    .post(withdrawV1Ctrl.check)


export default router;