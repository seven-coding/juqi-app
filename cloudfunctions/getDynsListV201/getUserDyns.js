// 查询新动态
// 个人主页动态列表（type=4）：若出现 DATABASE_TIMEOUT，请在云开发控制台为 dyn 集合建立复合索引：
// 字段：openId(升序)、dynStatus(升序)、isDelete(升序)、userTopTime(降序)、publicTime(降序)
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

    // 不再先执行 count()，避免 DATABASE_TIMEOUT（个人主页动态列表超时）
    // 客户端主要依赖 list + hasMore，count 用列表长度近似
    if (publicTime) {
        query.publicTime = _.lt(publicTime);
        delete sort.userTopTime
    }

    const result = await dealData(query, sort, limit, ownOpenId);

    return {
        code: 200,
        dynList: result.list,
        openId: ownOpenId,
        count: result.list.length,
        publicTime: result.publicTime
    };
}


const FOLLOW_STATUS_TIMEOUT_MS = 2500;

async function getFollowStatus(openId1, openId2) {
    // 我与该用户的关注关系；超时则按「未关注」处理，避免拖慢整请求导致 DATABASE_TIMEOUT
    try {
        const p = cloud.callFunction({
            name: 'commonRequestV201',
            data: {
                method: "get_follow_status",
                openId1,
                openId2,
            }
        });
        const race = await Promise.race([
            p,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('get_follow_status timeout')), FOLLOW_STATUS_TIMEOUT_MS)
            )
        ]);
        return race.result;
    } catch (e) {
        console.warn('[getUserDyns] getFollowStatus timeout or error, treat as not follow:', e && e.message);
        return false;
    }
}

exports.getUserDyns = getUserDyns;