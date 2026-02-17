const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;
const {
  errorCode
} = require('./errorCode')

async function getBlackList(event) {
  const wxContext = cloud.getWXContext();
  let ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let { openId = ownOpenId, page = 1, limit = 20 } = event;

  if (!openId) {
    return errorCode.NO_QUREY
  }

  let count = (await db.collection('user_black').where({ openId }).count()).total;

  // 查看自己的拉黑列表
  let blackList = (await db.collection('user_black')
  .aggregate()
  .match({ openId })
  .skip((page - 1) * limit)
  .limit(limit)
  .lookup({
    from: 'user',
    let: {
      openId: '$blackId'
    },
    pipeline: $.pipeline()
      .match(_.expr(
        $.eq(['$openId', '$$openId']),
      ))
      .project({
        _id: 0,
        avatarUrl: 1,
        nickName: 1,
        labels: 1,
        avatarVisitUrl: 1,
      })
      .done(),
    as: 'info',
  })
  .replaceRoot({
    newRoot: $.mergeObjects([$.arrayElemAt(['$info', 0]), '$$ROOT'])
  })
  .addFields({
    'openId': '$blackId'
  })
  .end()).list;

  return {
    userList: blackList,
    page,
    limit,
    count: count,
  }
}


exports.getBlackList = getBlackList;