const dayjs = require('dayjs')
const ms = require('ms')
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const duration = require('dayjs/plugin/duration');

dayjs.locale('zh-cn');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration)

const timeZone = 'Asia/Shanghai';
dayjs.tz.setDefault(timeZone);

//字符串转换为时间戳
function getDateTimeStamp(dateStr) {
    return Date.parse(dateStr.replace(/-/gi, "/"));
}

const formatNumber = n => {
    n = n.toString()
    return n[1] ? n : '0' + n
}

function formatDateTime(date, str = '-', hasTime = false) {
    let datestr = dayjs.tz(date).format(`YYYY${str}MM${str}DD`);
    if (hasTime) {
        datestr = dayjs.tz(date).format(`YYYY${str}MM${str}DD HH:mm:ss`);
    }
    return datestr;
}



function getDateDiff(dateStr) {
    const now = dayjs.tz();
    const nowTimestamp = now.valueOf()
    const targetTime = dayjs.tz(dateStr);
    const targetTimestamp = targetTime.valueOf()
    const timeGap = nowTimestamp - targetTimestamp

    if (timeGap >= ms('30d')) {
        return targetTime.format('YYYY-MM-DD HH:mm')
    }

    if (timeGap >= ms('3d') && timeGap < ms('30d')) {
        return targetTime.format('MM-DD HH:mm')
    }

    if (timeGap > ms('24h') && timeGap < ms('8d')) {
        return now.diff(targetTime, 'day') + '天前';
    }

    if (timeGap > ms('60m')) {
        return now.diff(targetTime, 'hour') + '小时前';
    }

    if (timeGap > ms('60s')) {
        return now.diff(targetTime, 'minute') + '分钟前';
    }

    if (timeGap > 0) {
        return now.diff(targetTime, 'second') + '秒前';
    } else {
        return '刚刚发表';
    }


}

exports.formatDate = function (time) {
    return getDateDiff(time);
}

exports.formatDateTime = formatDateTime