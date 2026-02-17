// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

const {
  setRedisExpire
} = require('./redis');


async function setUserInfo(openId, setUserInfo) {

  const result = await db.collection('user').where({
    openId
  }).update({
    data: setUserInfo
  });

  // 更新目标用户电量
  await setRedisExpire(openId, 0)
  return result;

}

exports.setUserInfo = setUserInfo;