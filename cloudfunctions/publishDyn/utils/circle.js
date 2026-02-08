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

// 获取getCircle表
async function getCircle(circleId) {

  let redisResult = await getRedisValue(circleId)
  if (redisResult) {
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

exports.getCircle = getCircle;