// 获取圈子列表
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')
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

// 圈子列表动态
async function getNoticeDyn(event, ownOpenId) {
  const db = cloud.database();
  const _ = db.command;
  let { limit = 20, circleId, publicTime, verifyStatus, type } = event;

  let count, result;
  let redisValue;

    // 正常圈子动态
  let query = {
      circleId: "04dd9d416378c3e300667b726c5b3124",
      dynStatus: 1,
      forwardDynId: _.exists(false)
  };

  redisValue = publicTime ? `${publicTime}-${circleId.split(8)[0]}` : `NEW_DYN_${circleId.split(8)[0]}`;

  let redisDyns = await getRedisValue(redisValue)
  console.log('redisValue', redisValue);

  if (redisDyns) {
    try {
      redisDyns = JSON.parse(redisDyns);
    }catch(error) {
      console.log("失败")
      redisDyns = ""
    }
  }


  if (redisDyns) {
    return redisDyns;
  } else {
    // 计算总数
    count = await db.collection('dyn').where(query).count();

    let sort;
    // 存在查询时间
    if (publicTime) {
      query.publicTime = _.lt(publicTime);
      sort = {
        publicTime: -1,
      };
    } else {
      sort = {
        topTime: -1, //圈子置顶根据该置顶消息置顶
        publicTime: -1,
      }
    }

    result = await dealData(query, sort, limit, ownOpenId);

    if (result.list.length) {
      await setRedisValue(redisValue, JSON.stringify({
        code: 200,
        dynList: result.list,
        openId: ownOpenId,
        count: count.total,
        publicTime: result.publicTime
      }))

      await setRedisExpire(redisValue, 60 * 20)
      console.log("没有缓存, 设置缓存：")
    }
    
    return {
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count: count.total,
      publicTime: result.publicTime
    };
  }

}

exports.getNoticeDyn = getNoticeDyn;

