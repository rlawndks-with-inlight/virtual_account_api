import express from 'express';
import { brandCtrl } from '../controllers/index.js';
const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/')
    .get(brandCtrl.list)
    .post(brandCtrl.create);

router
    .route('/:id')
    .get(brandCtrl.get)
    .put(brandCtrl.update)
    .delete(brandCtrl.remove);


export default router;