// 获取关注的人
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
    dealData
} = require('./dealData.js')
const {
    errorCode
} = require('./errorCode');

// 充电贴
async function getLikeDynList(event, ownOpenId) {
    // 在函数内部获取 db 实例，确保使用正确的环境
    const db = cloud.database()
    const _ = db.command

    console.log('get like dyn list func', event, ownOpenId)
    let {
        limit = 20, publicTime
    } = event;

    let count, result;
    // 风险控制在1
    let query = {
        like: _.elemMatch(_.eq(ownOpenId)),
        dynStatus: 1
    }

    const sort = {
        publicTime: -1,
    }

    // 计算总数
    count = 50;

    // 存在查询时间
    if (publicTime) {
        query.publicTime = _.lt(publicTime);
    }

    result = await dealData(query, sort, limit, ownOpenId);

    return {
        code: 200,
        dynList: result.list,
        openId: ownOpenId,
        count: count,
        publicTime: result.publicTime
    };

}

exports.getLikeDynList = getLikeDynList;