// 申请置顶（使用 env.getDb 按 dataEnv 读库）
const cloud = require('wx-server-sdk');
const { getDb } = require('../env');

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');


async function getUserInfo(openId) {
  const db = getDb();
  const _ = db.command;
  const $ = db.command.aggregate;

  let redisResult = await getRedisValue(openId);

  if (redisResult) {
    try {
      redisResult = JSON.parse(redisResult);
      if (redisResult) {
        return redisResult;
      }
    } catch (err) {
      console.error('[getUserInfo] Redis缓存JSON解析失败:', err);
      // 继续执行数据库查询
    }
  }
  
  if (!redisResult) { 
    let res = (await db.collection('user').aggregate()
    .match({
      openId,
    })
    .end()).list;

    if (res.length) {

      await setRedisValue(openId, JSON.stringify(res[0]))
      await setRedisExpire(openId, 60 * 5)
      
      return res[0]
    } else {
      return ""
    }
  }
}

// 更新User表
async function setUserInfo(data) {
  const db = getDb();
  let {openId, setUserInfo} = data;

  const result = await db.collection('user').where({
    openId
  }).update({
    data: setUserInfo
  });

  console.log(result)
  // 更新目标用户电量
  await setRedisExpire(openId, 0)
  return result;
}


exports.getUserInfo = getUserInfo;
exports.setUserInfo = setUserInfo;