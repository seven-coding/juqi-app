// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
  errorCode
} = require('./errorCode')
const _ = db.command;
const {
  CONFIG
} = require('config');
const $ = db.command.aggregate

// 查询第一屏列表
async function getMessagesUser(data) {
  try {
    let {
      openId,
      page,
      limit
    } = data
    console.log("enter getMessagesUser")

    let count = await db.collection('messagesType').where({
      to: openId,
      status: _.in([0, 1])
    }).count();

    console.log("enter getMessagesUser count", count)


    let messages = (await db.collection('messagesType').aggregate()
      .match({
        to: openId,
        status: _.in([0, 1])
      })
      .sort({
        status: 1,
        createTime: -1
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lookup({
        from: 'circle',
        localField: 'from',
        foreignField: '_id',
        as: 'circles',
      })
      .lookup({
        from: 'circle',
        let: {
          circleId: '$from'
        },
        pipeline: $.pipeline()
          .match(_.expr(
            $.eq(['$_id', '$$circleId']),
         ))
          .project({
            desc: 1,
            title: 1,
            _id: 1,
          })
          .done(),
        as: 'circles',
      })
      .lookup({
        from: 'dyn',
        localField: 'dynId',
        foreignField: '_id',
        as: 'dyn',
      })
      .lookup({
        from: 'messagesUser',
        localField: 'messageUserId',
        foreignField: '_id',
        as: 'messageInfo',
      })
      .lookup({
        from: 'user',
        localField: 'from',
        foreignField: 'openId',
        as: 'user',
      })
      .end());



    return {
      code: 200,
      messages: messages.list,
      count: count.total
    }
  } catch (error) {
    console.log(error)
    return {
      code: 400,
      message: '查询失败',
      error: error
    }
  }
}

exports.getMessagesUser = getMessagesUser;
