import express from 'express';

import pushRoutes from './push.route.js';
import virtualAccountRoutes from './virtual_account.route.js';

const router = express.Router(); // eslint-disable-line new-cap


router.use('/push', pushRoutes);
router.use('/virtual-account', virtualAccountRoutes);



export default router;
