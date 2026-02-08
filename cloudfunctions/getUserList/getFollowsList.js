const cloud = require('wx-server-sdk');
const { errorCode } = require('./errorCode');
const {
  dealData
} = require('./dealData');
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

// 获取个人关注列表
async function getFollowsList(event, ownOpenId) {
  let {
    openId = ownOpenId, page = 1, limit = 20
  } = event;

  if (!openId) {
    return errorCode.NO_QUREY
  }

  let query = {
    openId
  };

  let followingList, count;
  // 查询openId用户的关注列表

  count = (await db.collection('user_followee').where(query).count()).total;

  followingList = (await db.collection('user_followee')
    .aggregate()
    .match(query)
    .sort({
      createTime: -1
    })
    .skip((page - 1) * limit)
    .limit(limit)
    .lookup({
      from: 'user',
      let: {
        openId: '$followeeId'
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
          joinStatus: 1,
          openId: 1
        })
        .done(),
      as: 'info',
    })
    .replaceRoot({
      newRoot: $.mergeObjects([$.arrayElemAt(['$info', 0]), '$$ROOT'])
    })
    .addFields({
      'openId': '$followeeId'
    })
    .end()).list;

  // 无关注列表兼容
  if (!followingList || !followingList.length) {
    return {
      userList: [],
      page,
      limit: 0,
      count: 0,
    }
  }

  followingList.map(item => {
    if (item.ismutual) {
      item.followStatus = 4
    } else if (item.ismutual == 1) {
      item.status = 2
    } else {
      item.followStatus = 1;
    }
  })

  return {
    userList: followingList,
    page,
    limit,
    count: count,
  }
}


exports.getFollowsList = getFollowsList;