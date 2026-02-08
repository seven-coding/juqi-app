// 获取圈子列表
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');

// 圈子列表动态
async function getVerifyDyn(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command

  let { limit = 20, publicTime, verifyStatus, } = event;

  let count, result;
  let query, redisValue;
  
  // 新人区动态
  query = {
    dynStatus: 5,
    verifyStatus: 1
  };
  redisValue = publicTime ? `${publicTime}-${verifyStatus}` : `NEW_DYN_${verifyStatus}`;
 
  let redisDyns = await getRedisValue(redisValue)
  console.log('redisValue', redisValue);

  if (redisDyns) {
    console.log('命中缓存');
    try {
      redisDyns = JSON.parse(redisDyns);
      return redisDyns;
    } catch(error) {
      console.log(error)
    }
  } else {
    // 计算总数
    count = await db.collection('dyn').where(query).count();

    let sort = {
      publicTime: 1,
    };
    // 存在查询时间
    if (publicTime) {
      query.publicTime = _.gt(publicTime);
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
      await setRedisExpire(redisValue, 1)
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

exports.getVerifyDyn = getVerifyDyn;