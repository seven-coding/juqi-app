// 获取热门榜单
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  dealHotData
} = require('./dealHotData.js')
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');

const {
  BALACK_USER
} = require('./black');
const {
  ADMIN_USER
} = require('./admin');
const {
  dealBlackDyn
} = require("./dealBlackDyn");
const {
  dealFollowDyn
} = require('./dealFollowDyn')


// 获取热门榜单
async function getHotList(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command

  let {
    limit = 20, publicTime, type
  } = event;

  let redisValue = publicTime ? `${publicTime}-${type}` : `NEW_DYN_${type}`;

  let redisDyns = await getRedisValue(redisValue)

  if (publicTime) {
    return {
      code: 200,
      dynList: [],
      openId: ownOpenId,
      count: 20,
    };
  }

  if (false) {
    console.log('命中缓存');

    redisDyns = JSON.parse(redisDyns);

    redisDyns.dynList = await dealBlackDyn(ownOpenId, redisDyns.dynList)
    redisDyns.dynList = await dealFollowDyn(ownOpenId, redisDyns.dynList)

    return redisDyns;
  } else {

    let count, result;
    let time = new Date().valueOf() - 8 * 60 * 60 * 1000;

    // 风险控制在1，未删除；排除管理员/电站屏蔽、用户删除
    let query = {
      publicTime: _.gt(time),
      dynStatus: 1,
      dynType: _.neq(2), //热榜清除掉转发的帖子
      hiddenStatus: _.neq(1),
      isDelete: _.neq(1),
    }

    sort = {
      likeNums: -1,
      // publicTime: 1,
    }

    // 计算总数
    count = 40;

    result = await dealHotData(query, sort, limit, ownOpenId);

    await setRedisValue(redisValue, JSON.stringify({
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count: 20,
      publicTime: result.publicTime
    }))
    await setRedisExpire(redisValue, 60 * 2)
    console.log("没有缓存, 设置缓存：")

    result.list = await dealBlackDyn(ownOpenId, result.list);
    result.list = await dealFollowDyn(ownOpenId, result.list)

    return {
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count: 20,
      publicTime: result.publicTime
    };
  }

}

exports.getHotList = getHotList;