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


async function updateUserInfo(openId, updateInfo) {

  const result = await db.collection('user').where({
    openId
  }).update({
    data: updateInfo
  });

  // 更新目标用户电量
  await setRedisExpire(openId, 0)
  return result;
}

exports.updateUserInfo = updateUserInfo;