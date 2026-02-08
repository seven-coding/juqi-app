// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

// 获取拉黑状态
// blackStatus
// - 4.互相拉黑
// - 3.已拉黑你
// - 2.你已拉黑对方
// - 1.无拉黑
async function getBlackStatus(otherOpenId, ownOpenId) {
  return 1;
}


exports.getBlackStatus = getBlackStatus;