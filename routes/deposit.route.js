import express from 'express';
import { depositV1Ctrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1')
    .post(depositV1Ctrl.create)


export default router;