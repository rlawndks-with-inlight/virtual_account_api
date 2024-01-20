import io from "socket.io-client";
import 'dotenv/config';
import { insertQuery } from "../query-util.js";
import { commarNumber } from "../util.js";

const socket = io.connect(process.env.SOCKET_URL);

export const emitSocket = async (item) => {
    let { method, data, brand_id } = item;
    try {
        if (method == 'deposit') {
            let result = await insertQuery(`bell_contents`, {
                brand_id,
                user_id: data?.user_id ?? 0,
                title: '입금건이 들어왔습니다.',
                message: `${data?.nickname ?? ""} ${data?.deposit_acct_name}님이 ${commarNumber(data?.amount)} 원이 입금하였습니다.`,
                link: `/manager/deposit/list`,
            })
        }
        socket.emit("message", { method, data, brand_id });
    } catch (err) {
        console.log(err);
    }
}