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

function getDb() {
  return global.__GETMESSAGESNEW_DB__ || (cloud.init(), cloud.database());
}

// 查询访客消息
async function getAitMes(data) {
  const db = getDb();
  const _ = db.command;
  const $ = db.command.aggregate;
  try {
    let {
      openId,
      page,
      limit,
      aitType = 1
    } = data;

    let queryDb = "messagesOther";
    let queryData = {
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.AIT,
      aitType
    };

    let count = await db.collection(queryDb).where(queryData).count();

    let messages = (await db.collection(queryDb).aggregate()
      .match(queryData)
      .sort({
        status: 1,
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
      .lookup({
        from: 'dyn',
        localField: 'dynId',
        foreignField: '_id',
        as: 'dyn',
      })
      .end());


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
  const db = getDb();
  await db.collection(dbName).where(
      where
    )
    .update({
      data: update
    })
}


exports.getAitMes = getAitMes;
