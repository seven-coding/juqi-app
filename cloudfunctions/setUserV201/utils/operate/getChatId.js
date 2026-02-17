// 获取用户聊天房间Id
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('../redis');

// 获取用户聊天房间Id
async function getChatId(openId, otherOpenId) {

 
  let chatId = await getRedisValue(`${openId}_CHATS_${otherOpenId}`);
  if (chatId) {
    return chatId
  } else {
    // 查询我对对方的关注状态
    let chatIds = (await db.collection('chatIds').where(_.or([
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
    ])).get()).data;

    if (chatIds && chatIds.length) {

      await setRedisValue(`${openId}_CHATS_${otherOpenId}`, chatIds[0]._id);
      await setRedisExpire(`${openId}_CHATS_${otherOpenId}`, 60* 60);

      return chatId
    } else {

      await setRedisValue(`${openId}_CHATS_${to}`, false);
      await setRedisExpire(`${openId}_CHATS_${to}`, 60* 60);

      return false
    }
  }
 
}


exports.getChatId = getChatId;
