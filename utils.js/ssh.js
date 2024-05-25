import { Client } from "ssh2";
import 'dotenv/config';

export const execSSH = (exec_text = "") => {
    try {
        let ssh_obj = {
            host: process.env.BACK_HOST,
            port: 22, // 기본 포트는 22번입니다.
            username: process.env.BACK_USERNAME,
            password: process.env.BACK_PASSWORD,
            readyTimeout: 1000 * 60 * 10 // 타임아웃 시간을 10분으로 설정
        }
        console.log(123)
        const conn = new Client();
        conn.on('ready', () => {
            console.log('Client :: ready');
            conn.exec(exec_text, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code, signal) => {
                    console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                    conn.end();
                }).on('data', (data) => {
                    console.log('STDOUT: ' + data);
                }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
            });
        }).connect(ssh_obj);
    } catch (err) {
        console.log(err)
    }

}