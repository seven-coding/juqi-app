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
} = require('./redis');

// 给动态点赞
async function getUserInfo(openId) {

  let redisResult = await getRedisValue(openId)

  if (redisResult) {
    console.log('命中缓存');

    redisResult = JSON.parse(redisResult);
    return redisResult;
  } else { 
    let res = (await db.collection('user').aggregate()
    .match({
      openId,
    })
    .end()).list;

    if (res.length) {
      return res[0]
    } else {
      return "NOT_REGISTER"
    }
  }
}

exports.getUserInfo = getUserInfo;