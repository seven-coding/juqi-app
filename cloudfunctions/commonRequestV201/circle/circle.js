// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('../redis');

// 获取User表
async function getCircle(event) {
  let {circleId} = event;

  let redisResult = await getRedisValue(circleId)

  if (redisResult) {
    console.log('命中缓存');

    console.log(redisResult)
    redisResult = JSON.parse(redisResult);
    return redisResult;
  } else { 
    let res = (await db.collection('circle').aggregate()
    .match({
      _id: circleId,
    }).end()).list;

    if (res.length) {
      await setRedisValue(circleId, JSON.stringify(res[0]))
      await setRedisExpire(circleId, 60 * 60 * 24)
      
      return res[0]
    } else {
      return ""
    }
    
  }
}

// 更新User表
async function setCircle(openId, info) {

  const result = await db.collection('user').where({
    openId
  }).update({
    data: info
  });

  // 更新目标用户电量
  await setRedisExpire(openId, 0)
  return result;
}

exports.getCircle = getCircle;
exports.setCircle = setCircle;