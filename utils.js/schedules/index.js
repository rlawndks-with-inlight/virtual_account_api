import schedule from 'node-schedule';
import { pushDepositNoti } from './push-noti.js';

const scheduleIndex = () => {
    schedule.scheduleJob('0 0/1 * * * *', async function () {
        pushDepositNoti();
    })
}

export default scheduleIndex;