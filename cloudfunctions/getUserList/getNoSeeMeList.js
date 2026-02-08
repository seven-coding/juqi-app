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
async function getNoSeeMeList(event, openId) {
  let {
    page = 1, limit = 20
  } = event;

  if (!openId) {
    return errorCode.NO_QUREY
  }

  let query = {
    noSeeId: openId,
    type: 2
  };

  let userList, count;
  // 查询openId用户的关注列表

  count = (await db.collection('user_no_see').where(query).count()).total;

  userList = (await db.collection('user_no_see')
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
          joinStatus: 1,
          openId: 1,
          vipStatus: 1,
        })
        .done(),
      as: 'info',
    })
    .replaceRoot({
      newRoot: $.mergeObjects([$.arrayElemAt(['$info', 0]), '$$ROOT'])
    })
    .end()).list;

  // 无关注列表兼容
  if (!userList || !userList.length) {
    return {
      userList: [],
      page,
      limit: 0,
      count: 0,
    }
  }

  userList.map(item => {
    if (item.ismutual) {
      item.followStatus = 4
    } else if (item.ismutual == 1) {
      item.status = 2
    } else {
      item.followStatus = 1;
    }
  })

  return {
    userList: userList,
    page,
    limit,
    count: count,
  }
}


exports.getNoSeeMeList = getNoSeeMeList;