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


// 查询访客消息
// 会员用户只能查看三条
async function getVisitMessage(data) {
  try {
    let {
      openId,
      page,
      limit
    } = data;

    let vipStatus = (await db.collection('user').where({ 
      openId,
      vipStatus: true
    }).get()).data.length > 0;

    limit = vipStatus ? limit : 3;

    let queryDb = "messagesOther";
    let queryData = {
        to: openId,
        // status: 0,
        type: 3
    };

    let count = await db.collection(queryDb).where(queryData).count();

    let messages = (await db.collection(queryDb).aggregate()
      .match(queryData)
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
      .end());


    queryData.status = 0;
    
    // 消息置为已读
    await alreadyRead(
      queryDb,
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
  console.log("执行访客消息置为已读");
  console.log(dbName, where, update);

  let result = await db.collection(dbName).where(
      where
    )
    .update({
      data: update
    })

    console.log(result)
    return;
}



exports.getVisitMessage = getVisitMessage;
