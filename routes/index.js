import express from 'express';

import trxRoutes from './trx.route.js';

const router = express.Router(); // eslint-disable-line new-cap


router.use('/trx', trxRoutes);



export default router;
