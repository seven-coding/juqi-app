
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');
const _ = db.command;

const VISIBLE_DYN_STATUS = _.in([1, 6]);
const {
  dealBlackDyn
} = require("./dynUtils/dealBlackDyn");

const {
  dealData
} = require("./dealData");

// 获取广场列表动态
async function getTopicList(event, ownOpenId) {
  let {
    limit = 20, page = 1, 
  } = event;

  // let count = await getDynCount(REDIS_CONFIG.GET_SQUARE_TOTAL, countQuery);
  // console.log("计算总值：" + count)

  let redisValue = page ? `${page}_HUATI_LIST` : `SQUARE_DYN_HUATI_LIST`;
  console.log('redisValue:', redisValue)

  let redisDyns = await getRedisValue(redisValue);


  if (false ) {
    console.log('命中缓存');
    redisDyns = JSON.parse(redisDyns);

    ownOpenId && (redisDyns.dynList = await dealBlackDyn(ownOpenId, redisDyns.dynList))
    // ownOpenId && (redisDyns.dynList = await dealFollowDyn(ownOpenId, redisDyns.dynList))

    return redisDyns;
  } else {
    let result;
    // 风险控制在1
    let query = {
      dynStatus: VISIBLE_DYN_STATUS,
    }


    result = await dealData(query, page, limit, ownOpenId);

    // await setRedisValue(redisValue, JSON.stringify({
    //   code: 200,
    //   dynList: result.list,
    //   openId: ownOpenId,
    //   publicTime: result.publicTime
    // }))
    // await setRedisExpire(redisValue, 5)
    // console.log("没有缓存, 设置缓存：")

    // 过滤黑名单
    // result.list = await dealBlackDyn(ownOpenId, result.list);
    // result.list = await dealFollowDyn(ownOpenId, result.list)

    return {
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count: "",
      page: result.page
    };
  }

}

exports.getTopicList = getTopicList;