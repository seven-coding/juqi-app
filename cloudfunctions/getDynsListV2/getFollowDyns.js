// 获取关注的人
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
    dealData
} = require('./dealData.js')
const {
    errorCode
} = require('./errorCode');
const {
    getRedisValue,
    setRedisValue,
    setRedisExpire
} = require('./utils/redis');


// 关注的人动态
async function getFollowDyns(event, ownOpenId) {
    const db = cloud.database();
    const _ = db.command;
    let {
        limit = 20, publicTime
    } = event;

    let followingList = await getFollowingList(ownOpenId)

    if (!followingList) {
        // 还没有关注的人
        return errorCode.NO_FOLLOW;
    }

    // let redisValue = publicTime ? `${ownOpenId}_${publicTime}_F_LIST` : `${ownOpenId}_F_LIST`;
    // console.log('redisValue:', redisValue)
    // let redisDyns = await getRedisValue(redisValue);

    // if (redisDyns) {
    //   try {
    //     console.log('命中缓存');
    // redisDyns = JSON.parse(redisDyns);

    //     redisDyns.dynList.filter(item => {
    //       return followingList.inlucdes(item.openId)
    //     })

    //     return redisDyns
    //   } catch (error) {
    //     console.log(error)
    //   }
    // } else {

    let count, result;
    if (!!!followingList.length) {
        return {
            code: 200,
            dynList: [],
            openId: ownOpenId,
            count: "",
            publicTime
        };
    }
    // 风险控制在1；排除管理员/电站屏蔽、用户删除
    let query = {
        openId: _.in(followingList),
        dynStatus: _.in([1, 3, 6, 7, 9]),
        hiddenStatus: _.neq(1),
        isDelete: _.neq(1),
    }

    sort = {
        publicTime: -1,
    }

    // 计算总数
    // count = await db.collection('dyn').where(query).count();

    // 存在查询时间
    if (publicTime) {
        query.publicTime = _.lt(publicTime);
    }

    result = await dealData(query, sort, limit, ownOpenId);

    // await setRedisValue(result, JSON.stringify({
    //   code: 200,
    //   dynList: result.list,
    //   openId: ownOpenId,
    //   // count,
    //   publicTime: result.publicTime
    // }))
    // await setRedisExpire(result, 60 * 5)

    return {
        code: 200,
        dynList: result.list,
        openId: ownOpenId,
        count: "",
        publicTime: result.publicTime
    };
    // }

}


// 关注列表
async function getFollowingList(openId) {
    const db = cloud.database();
    try {
        let redisResult = await getRedisValue(`followingList_${openId}`);

        if (redisResult) {
            console.log('关注列表命中缓存');
            return JSON.parse(redisResult);
        } else {
            console.log('关注列表未命中缓存');

            let following = (await db.collection('user_followee').where({
                openId: openId,
                status: 1
            }).limit(1000).get()).data;

            if (!following || !following.length) {
                // 还没有关注的人f
                return [];
            }

            let followingList = following.map((val, i) => {
                return val.followeeId
            })

            // TODO: 在操作关注操作后更新粉丝的redis
            await setRedisValue(`followingList_${openId}`, JSON.stringify(followingList));
            await setRedisExpire(`followingList_${openId}`, 60 * 4)

            return followingList;
        }
    } catch (error) {
        console.log(error);
        return 0;
    }
}

exports.getFollowDyns = getFollowDyns;
exports.getFollowingList = getFollowingList