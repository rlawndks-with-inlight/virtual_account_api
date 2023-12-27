import express from 'express';
import { virtualAccountCtrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/')
    .post(virtualAccountCtrl.request)
router
    .route('/check')
    .post(virtualAccountCtrl.requestCheck)

export default router;