const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

// 获取粉丝列表
async function getCircleFollower(event, ownOpenId) {
  let { page = 1, limit = 20, circleId } = event;

  if (!circleId) {
    return {
      code: 400,
      message: '缺少参数'
    }
  }

  // 获取圈子信息
  const result = await db.collection('circle').doc(circleId).get();
  let { data } = result;
  let follow = data.follow;
  if (!follow || !follow.length) {
    return {
      userList: [],
      page,
      limit: 0,
      count: 0,
      type
    }
  }
  let offset = (page - 1) * limit;
  let userList = (offset + limit >= follow.length) ? follow.slice(offset, follow.length) : follow.slice(offset, offset + limit)
  userList = await db.collection('user').where({
    openId: _.in(userList)
  }).get();

  return {
    userList: userList.data,
    page,
    limit,
    count: follow.length,
    type
  }
}

exports.getCircleFollower = getCircleFollower;