// 设置聊天关系拉黑
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

const {
  setRedisExpire
} = require('./utils/redis');


async function setChatId(openId, otherOpenId) {

  await setRedisExpire(`${openId}_CHATS_${otherOpenId}`, 0)
  await setRedisExpire(`${otherOpenId}_CHATS_${openId}`, 0)

  // 私人聊天关系解除
  await db.collection('chatIds').where(_.or([
    {
      from: openId,
      to: otherOpenId,
      status: 1,
      type: 1
    },
    {
      from: otherOpenId,
      to: openId,
      status: 1,
      type: 1
    },
  ])).update({
    data: {
      status: 2
    }
  });

  return;
}

exports.setChatId = setChatId;