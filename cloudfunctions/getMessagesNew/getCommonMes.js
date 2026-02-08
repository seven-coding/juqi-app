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
async function getCommonMes(data) {
  try {
    console.log("enter getCommonMes")
    let {
      page,
      limit,
      openId,
      groupType,
      from,
      status
    } = data

    let queryDb = "messagesUser";
    let queryData = _.or([{
        to: openId,
        groupType: groupType || from,
        status
    }, {
      to: groupType || from,
      groupType: openId,
      status
  }]);

    let count = await db.collection(queryDb).where(queryData).count();

    let messages = (await db.collection(queryDb).aggregate()
      .match(queryData)
      .sort({
        createTime: -1
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lookup({
        from: 'circle',
        localField: 'from',
        foreignField: '_id',
        as: 'circle',
      })
      .lookup({
        from: 'dyn',
        localField: 'dynId',
        foreignField: '_id',
        as: 'dyns',
      })
      .end());

    console.log("enter getCommonMes messages", messages)



    // messageUser消息置为已读
    await alreadyRead(
      queryDb,
      queryData, {
        status: 1,
        noReadCount: 0
      }
    );

    // messageGroup消息置为已读
    await alreadyRead(
      'messagesType',
      queryData, {
        status: 1,
        noReadCount: 0
      }
    );

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

// 消息置为已读
async function alreadyRead(dbName, where, update) {
  await db.collection(dbName).where(
      where
    )
    .update({
      data: update
    })
}

exports.getCommonMes = getCommonMes;