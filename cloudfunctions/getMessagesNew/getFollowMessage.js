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
const {
  getUserInfo
} = require('getUserInfo');
const $ = db.command.aggregate


// 查询关注提醒
async function getFollowMessage(data) {
  try {
    let {
      openId,
      page,
      limit,
      status,
    } = data;

    let queryDb = "messagesUser";
    let queryData = {
      to: openId,
      groupType: 1,
      status,
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
      .end());

    // 增加对方被关注的人列表
    // let userInfo = await getUserInfo(openId);
    // let isVip = userInfo.vipStatus;
    // if (isVip) {
    //   messages.list.map((item, index) => {
    //     // 处理会员取消关注
    //     console.log(item)
    //     if (item.type == 17){
    //       messages.list[index].secondName = "有人"
    //       messages.list[index].userInfo[0].nickName = '有人'
    //     }
    //   })
    // }


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

exports.getFollowMessage = getFollowMessage;

// 消息置为已读
async function alreadyRead(dbName, where, update) {
  await db.collection(dbName).where(
      where
    )
    .update({
      data: update
    })
}
