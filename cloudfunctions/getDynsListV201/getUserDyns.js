// 查询新动态
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
    dealData
} = require('./dealData.js')

// 获取用户列表动态
async function getUserDyns(event, ownOpenId) {
    // 在函数内部获取 db 实例，确保使用正确的环境
    const db = cloud.database()
    const _ = db.command

    const {
        limit = 20, openId, publicTime
    } = event;

    const isOwn = ownOpenId == openId;
    let dynStatus = _.nin([2, 5])
    if (!!!isOwn) {
        let ifFollow = await getFollowStatus(ownOpenId, openId);
        dynStatus = ifFollow ? _.in([0, 1, 3, 6, 7, 9]) : _.in([0, 1, 3, 6, 7])
        // [0, 1, 3, 6, 7]
    }

    const query = {
        openId,
        dynStatus,
        isDelete: _.neq(1),
    }

    const sort = {
        userTopTime: -1,
        publicTime: -1,
    };

    // 计算总数
    const {
        total
    } = await db.collection('dyn').where(query).count();

    if (publicTime) {
        query.publicTime = _.lt(publicTime);
        delete sort.userTopTime
    }

    const result = await dealData(query, sort, limit, ownOpenId);

    return {
        code: 200,
        dynList: result.list,
        openId: ownOpenId,
        count: total,
        publicTime: result.publicTime
    };
}


async function getFollowStatus(openId1, openId2) {
    //我跟这个人的关注关系
    let followStatus = (await cloud.callFunction({
        name: 'commonRequestV201',
        // 传递给云函数的event参数
        data: {
            method: "get_follow_status",
            openId1,
            openId2,
        }
    })).result;

    return followStatus;
}

exports.getUserDyns = getUserDyns;