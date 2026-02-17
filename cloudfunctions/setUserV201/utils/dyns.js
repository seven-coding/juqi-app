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
async function getDynsInfo(dynId) {

  let key = `${dynId}`;
  let redisResult = await getRedisValue(key)

  if (redisResult) {
    console.log('命中缓存');

    redisResult = JSON.parse(redisResult);
    return redisResult;
  } else { 
    let res = (await db.collection('dyn').aggregate()
    .match({
      _id: openId,
    })
    .end()).list;

    if (res.length) {

      await setRedisValue(key, JSON.stringify(res[0]))
      await setRedisExpire(key, 100)
      
      return res[0]
    } else {
      return ""
    }
  }
}

async function setDynsInfo(dynId, updateInfo) {

  const result = await db.collection('dyn').where({
    _id: dynId
  }).update({
    data: updateInfo
  });

  // 更新目标用户电量
  await setRedisExpire(dynId, 0)
  return result;
}

exports.getDynsInfo = getDynsInfo;
exports.setDynsInfo = setDynsInfo;