// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
// const {
//   errorCode
// } = require('./errorCode')
const _ = db.command;
const $ = db.command.aggregate;

// 获取用户权限
async function getDynsRec(keyword, page = 1, limit = 20) {
  try {
    let query = {
      dynStatus: 1,
      dynContent: db.RegExp({
        regexp: keyword,
        options: 'i',
      }),
    };

    let count = await db.collection('dyn').where(query).count();
    let list = (await db.collection('dyn').aggregate().match(query).sort({
      publicTime: -1,
    }).skip((page - 1) * limit)
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
          country: 1,
          openId: 1,
          joinStatus: 1,
          avatarVisitUrl: 1
        })
        .done(),
      as: 'userInfo',
    })
    .project({
      like: 0
    })
    .end()).list;
    console.log(list)

    return {
      code: 200,
      count: count.total,
      list: list,
    };

  } catch (error) {
    console.log(error);
    return {
      code: 400,
      message: "后端执行报错，请反馈到橘气家长电站"
    }
  }
}

exports.getDynsRec = getDynsRec;