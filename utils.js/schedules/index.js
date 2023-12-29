import schedule from 'node-schedule';
import { sendToMother } from './send-to-mother.js';

const scheduleIndex = () => {
    schedule.scheduleJob('0 0/1 * * * *', async function () {
        sendToMother();
    })
}

export default scheduleIndex;