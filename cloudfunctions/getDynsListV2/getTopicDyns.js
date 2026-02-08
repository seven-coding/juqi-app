// 查询话题新动态
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')
// 不上广场名单
const {
  ADMIN_USER
} = require('./admin');
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');
 // 不上广场名单
let BALACK_USER = []
const { dealBlackDyn } = require("./dealBlackDyn");

// 获取广场列表动态
async function getTopicDyns(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command

  let { limit = 20, publicTime, topic } = event;

  let count, result;
  let redisValue = publicTime ? `${publicTime}_${topic}_TOPIC_LIST` : `${topic}_TOPIC_LIST`;
  let redisDyns = await getRedisValue(redisValue);

  if (redisDyns) {
    console.log('命中缓存');
    redisDyns = JSON.parse(redisDyns);

    // 过滤黑名单
    redisDyns.dynList = await dealBlackDyn(ownOpenId, redisDyns.dynList)

    return redisDyns;
  } else {
    let result;

    let query = {
      topic,
      dynStatus: 1,
      hiddenStatus: _.neq(1),
      isDelete: _.neq(1),
    }
    let sort = {
      publicTime: -1,
    };

    // 计算总数
    count = await db.collection('dyn').where(query).count();

    // 存在查询时间
    if (publicTime) {
      query.publicTime = _.lt(publicTime);
    }

    result = await dealData(query, sort, limit, ownOpenId);


    await setRedisValue(redisValue, JSON.stringify({
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count,
      publicTime: result.publicTime
    }))
    await setRedisExpire(redisValue, 60)
    console.log("没有缓存, 设置缓存：")

    // 过滤黑名单
    result.list = await dealBlackDyn(ownOpenId, result.list);
    
    return {
      code: 200,
      dynList: result.list,
      count: count.total,
      publicTime: result.publicTime
    };
   
  }

}




exports.getTopicDyns = getTopicDyns;