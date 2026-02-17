const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

// 获取粉丝列表
async function getFollowersList(event, ownOpenId) {
  let { openId = ownOpenId, page = 1, limit = 20 } = event;
  // 查询 正在关注 当前openId的用户
  let followersList = (await db.collection('user_followee')
    .aggregate()
    .match({
      followeeId: openId
    })
    .sort({
      createTime: -1
    })
    .skip((page - 1) * limit)
    .limit(limit)
    .project({
      openId: true,
      ismutual: true,
      _id: 0
    })
    .lookup({
      from: 'user',
      let: {
        openId: '$openId'
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
          joinStatus: 1
        })
        .done(),
        as: 'info',
      })
    .replaceRoot({
      newRoot: $.mergeObjects([ $.arrayElemAt(['$info', 0]), '$$ROOT' ])
    })
    .end()).list;

    let count = (await db.collection('user_followee')
    .where({
      followeeId: openId
    })
    .count()).total;

  return {
    userList: followersList ? followersList : [],
    count
  }
}

exports.getFollowersList = getFollowersList;