import jwt from 'jsonwebtoken';
import 'dotenv/config';


export const checkIsManagerUrl = async (req) => {//관리자 url 인지
    let { baseUrl } = req;
    if (baseUrl.split('/')[2] == 'manager') {
        return true;
    }
    return false;
}
export const returnMoment = (d) => {
    var today = new Date();
    if (d) {
        today = new Date(d);
    }
    var year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2);
    var day = ('0' + today.getDate()).slice(-2);
    var dateString = year + '-' + month + '-' + day;
    var hours = ('0' + today.getHours()).slice(-2);
    var minutes = ('0' + today.getMinutes()).slice(-2);
    var seconds = ('0' + today.getSeconds()).slice(-2);
    var timeString = hours + ':' + minutes + ':' + seconds;
    let moment = dateString + ' ' + timeString;
    return moment;
}
export const differenceTwoDate = (f_d_, s_d_) => {//두날짜의 시간차
    let f_d = new Date(f_d_).getTime();//큰시간
    let s_d = new Date(s_d_).getTime();//작은시간
    let hour = (f_d - s_d) / (1000 * 3600);
    let minute = (f_d - s_d) / (1000 * 60);
    let day = (f_d - s_d) / (1000 * 3600 * 24);
    return day;
}
export const differenceSecondTwoDate = (f_d_, s_d_) => {//두날짜의 시간차
    let f_d = new Date(f_d_).getTime();//큰시간
    let s_d = new Date(s_d_).getTime();//작은시간
    let second = (f_d - s_d) / (1000);
    let minute = (f_d - s_d) / (1000 * 60);
    let hour = (f_d - s_d) / (1000 * 3600);
    let day = (f_d - s_d) / (1000 * 3600 * 24);
    return second;
}
export const getUserFee = (item, user_level, operator_list = [], head_office_fee, is_oper_dns) => {
    let top_fee = head_office_fee;
    let level = 40;
    let result = 0;
    let oper_label = `sales`;
    if (is_oper_dns) {
        oper_label = `top_offer`;
    }
    for (var i = 0; i < operator_list.length; i++) {
        if (item[`${oper_label}${operator_list[i].num}_id`] > 0) {
            if (user_level == level) {
                return (parseFloat(item[`${oper_label}${operator_list[i].num}_fee`] ?? 0) - parseFloat(top_fee)).toFixed(3);
            }
            top_fee = item[`${oper_label}${operator_list[i].num}_fee`];
            level = operator_list[i].value;
        }
    }
    if (user_level == level) {
        return (parseFloat(item[`${is_oper_dns ? `head_office_fee` : `mcht_fee`}`] ?? 0) - parseFloat(top_fee)).toFixed(3);
    }
    if (user_level == 10) {
        return (100 - parseFloat(item[`mcht_fee`] ?? 0)).toFixed(3);
    }
    return result;
}
export const getUserWithDrawFee = (item, user_level, operator_list = [], withdraw_head_office_fee, is_oper_dns) => {
    let top_fee = withdraw_head_office_fee;

    let level = 40;
    let result = 0;
    let oper_label = `sales`;
    if (is_oper_dns) {
        oper_label = `top_offer`;
    }
    for (var i = 0; i < operator_list.length; i++) {
        if (item[`${oper_label}${operator_list[i].num}_id`] > 0) {
            if (user_level == level) {
                return (parseFloat(item[`${oper_label}${operator_list[i].num}_withdraw_fee`] ?? 0) - parseFloat(top_fee)).toFixed(3);
            }
            top_fee = item[`${oper_label}${operator_list[i].num}_withdraw_fee`];
            level = operator_list[i].value;
        }
    }
    if (user_level == level) {
        return (parseFloat(item[`${is_oper_dns ? `withdraw_head_office_fee` : `withdraw_fee`}`] ?? 0) - parseFloat(top_fee)).toFixed(3);
    }
    // if (user_level == 10) {
    //   return (100 - parseFloat(item[`withdraw_fee`] ?? 0)).toFixed(3);
    // }
    return result;
}
export const getUserDepositFee = (item, user_level, operator_list = [], deposit_head_office_fee, is_oper_dns) => {
    let top_fee = deposit_head_office_fee;

    let level = 40;
    let result = 0;
    let oper_label = `sales`;
    if (is_oper_dns) {
        oper_label = `top_offer`;
    }
    for (var i = 0; i < operator_list.length; i++) {
        if (item[`${oper_label}${operator_list[i].num}_id`] > 0) {
            if (user_level == level) {
                return (parseFloat(item[`${oper_label}${operator_list[i].num}_deposit_fee`] ?? 0) - parseFloat(top_fee)).toFixed(3);
            }
            top_fee = item[`${oper_label}${operator_list[i].num}_deposit_fee`];
            level = operator_list[i].value;
        }
    }
    if (user_level == level) {
        return (parseFloat(item[`${is_oper_dns ? `deposit_head_office_fee` : `deposit_fee`}`] ?? 0) - parseFloat(top_fee)).toFixed(3);
    }
    // if (user_level == 10) {
    //   return (100 - parseFloat(item[`withdraw_fee`] ?? 0)).toFixed(3);
    // }
    return result;
}
export const makeObjKeysLowerCase = (obj = {}) => {
    let keys = Object.keys(obj);
    let result = {};
    for (var i = 0; i < keys.length; i++) {
        result[keys[i].toLowerCase()] = obj[keys[i]];
    }
    return result;
}