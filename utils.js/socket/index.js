import io from "socket.io-client";
import 'dotenv/config';
import { insertQuery } from "../query-util.js";
import { commarNumber } from "../util.js";

const socket = io.connect(process.env.SOCKET_URL);

export const emitSocket = async (item) => {
    let { method, data = {}, brand_id } = item;
    try {
        let title = '';
        let message = '';
        let link = '';
        if (method == 'deposit') {
            title = '입금건이 들어왔습니다.';
            message = `${data?.nickname ?? ""} ${data?.deposit_acct_name}님이 ${commarNumber(data?.amount)} 원을 입금하였습니다.`;
            link = `/manager/deposit/list`
            let result = await insertQuery(`bell_contents`, {
                brand_id,
                user_id: data?.user_id ?? null,
                title,
                message,
                link,
            })
            data['id'] = result?.result?.insertId;
            data['message'] = message;
            data['link'] = link;
        } else if (method == 'withdraw_request') {
            title = '출금요청건이 들어왔습니다.';
            message = `${data?.nickname ?? ""} ${data?.settle_acct_name}님이 ${commarNumber(data?.amount)} 원을 출금 요청을 하였습니다.`;
            link = `/manager/withdraw/list`
            let result = await insertQuery(`bell_contents`, {
                brand_id,
                user_id: data?.user_id ?? null,
                title,
                message,
                link,
            })
            data['id'] = result?.result?.insertId;
            data['message'] = message;
            data['link'] = link;
        }
        socket.emit("message", { method, data, brand_id, title });
    } catch (err) {
        console.log(err);
    }
}