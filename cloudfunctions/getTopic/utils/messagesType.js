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
async function getMesType(mesId) {

  let redisResult = await getRedisValue(mesId)

  if (redisResult) {
    console.log('命中缓存');

    redisResult = JSON.parse(redisResult);
    return redisResult;
  } else { 
    let res = (await db.collection('messagesType').aggregate()
    .match({
      _id: mesId,
    })
    .end()).list;

    if (res.length) {

      await setRedisValue(mesId, JSON.stringify(res[0]))
      await setRedisExpire(mesId, 100)
      
      return res[0]
    } else {
      return "NO_MESSAGE"
    }
  }
}

async function setMesType(data, updateInfo) {

  const result = await db.collection('messagesType').where(data).update({
    data: updateInfo
  });

  return result;
}

exports.getMesType = getMesType;
exports.setMesType = setMesType;