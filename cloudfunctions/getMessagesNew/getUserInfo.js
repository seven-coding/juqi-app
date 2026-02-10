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

function getDb() {
  return global.__GETMESSAGESNEW_DB__ || (cloud.init(), cloud.database());
}

// 给动态点赞
async function getUserInfo(openId) {
  const db = getDb();
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