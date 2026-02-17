


// 工具函数（使用 env.getDb 按 dataEnv 写库）
const cloud = require('wx-server-sdk');
const { getDb } = require('./env');
const {
  CONFIG
} = require('./config')

// 添加消息
async function sendAitMessage(data) {
  const db = getDb();
  let createTime = new Date().valueOf();
  let { dynId, from, to, ait } = data;


  let result = await db.collection('messagesOther').add({
    data: {
      status: 0, //代表提示，1代表不提示
      createTime,
      dynId,
      from,
      to,
      aitType: 1,
      type: 4,
      ait
    }
  });

  return;
}


exports.sendAitMessage = sendAitMessage;