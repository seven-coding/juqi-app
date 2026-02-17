// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

// 获取关注状态
// followType：
// - 4.互相关注
// - 3.已关注你
// - 2.你已关注对方
// - 1.无关注





exports.getFollowStatus = getFollowStatus;