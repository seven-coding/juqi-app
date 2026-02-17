const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

// 获取粉丝列表
async function getCharging(event, ownOpenId) {
  let { page = 1, limit = 20 } = event;

  // 用户电量列表
  let userList = await db.collection('messagesOther').aggregate()
    .match({
      to: ownOpenId,
      type: 1,
      chargeType: 2
    })
    .sort({
      createTime: -1
    })
    .skip((page - 1) * limit)
    .limit(limit)
    .lookup({
      from: 'user',
      localField: 'from',
      foreignField: 'openId',
      as: 'userInfo',
    })
    .end();

  let count = await db.collection('messagesOther').where({
    to: ownOpenId,
    type: 1,
    chargeType: 2
  }).count();

  // 电量消息置为1
  await db.collection('messagesOther').where({
    to: ownOpenId,
    type: 1,
    chargeType: 2
  })
    .update({
      data: {
        status: 1
      },
    })

  return {
    userList: userList.list,
    page,
    limit,
    count: count.total,
    type
  }
}

exports.getCharging = getCharging;