// 是否被对方拉黑（使用 env.getDb 按 dataEnv 读库）
const cloud = require('wx-server-sdk');
const { getDb } = require('./env');

// 是否被拉黑
async function userAuth(ownOpenId, otherOpenId) {
  const db = getDb();
  if (ownOpenId == otherOpenId) {
    return true
  }

  // 查询拉黑状态
  let followStatus = (await db.collection('user_black').where({
    openId: otherOpenId,
    blackId: ownOpenId
  }).get()).data.length > 0;

  if (followStatus) {
    return false
  } else {
    return true
  }
}

exports.userAuth = userAuth;