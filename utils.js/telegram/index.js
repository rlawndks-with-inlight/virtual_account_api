import TelegramBot from "node-telegram-bot-api"

export const sendTelegramBot = (dns_data = {}, message, ids = []) => {
    try {
        if (dns_data?.is_use_telegram_bot == 1) {
            let token = dns_data?.telegram_bot_token;
            console.log(token)
            const telebot = new TelegramBot(token);
            for (var i = 0; i < ids.length; i++) {
                telebot.sendMessage(ids[i], message);
            }
        }
    } catch (err) {
        console.log(err)
    }

}
