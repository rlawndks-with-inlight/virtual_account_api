import express from 'express';

import pushRoutes from './push.route.js';
import virtualAccountRoutes from './virtual_account.route.js';
import withdrawRoutes from './withdraw.route.js';
import depositRoutes from './deposit.route.js';
import authRoutes from './auth.route.js';
import giftCardRoutes from './gift_card.route.js';

const router = express.Router(); // eslint-disable-line new-cap


router.use('/push', pushRoutes);
router.use('/acct', virtualAccountRoutes);
router.use('/withdraw', withdrawRoutes);
router.use('/deposit', depositRoutes);
router.use('/auth', authRoutes);
router.use('/gift', giftCardRoutes);



export default router;
