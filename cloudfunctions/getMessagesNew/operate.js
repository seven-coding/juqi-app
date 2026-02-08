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

// 获取用户权限
async function getNotReadCount(openId) {

  try {
    let visitorNums, commentNums, chargeNums, aitType1Nums, aitType2Nums;
    // 查询访客数据
    visitorNums = await db.collection('messagesOther').where({
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.VISIT,
      status: 0,
    }).count();

    commentNums = await db.collection('messagesOther').where({
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.COMMENT,
      status: 0
    }).count();

    chargeNums = await db.collection('messagesOther').where({
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.CHARGE,
      status: 0
    }).count();

    aitType1Nums = await db.collection('messagesOther').where({
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.AIT,
      status: 0,
      aitType: 1
    }).count();
    
    aitType2Nums = await db.collection('messagesOther').where({
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.AIT,
      status: 0,
      aitType: 2
    }).count();

    return {
      visitorNums,
      commentNums,
      chargeNums,
      // aitNums,
      aitType2Nums,
      aitType1Nums
    }
  } catch (error) {
    console.log(error)
    return {}
  }
}

// 查询电量消息
async function getChargeMessage(data) {
  try {
    let {
      openId,
      page,
      limit
    } = data
    let queryData = {
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.CHARGE,
    }

    let count = await db.collection('messagesOther').where(queryData).count();

    let messages = (await db.collection('messagesOther').aggregate()
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
      'messagesOther',
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

// 查询评论消息
async function getCommentMessage(data) {
  try {
    let {
      openId,
      page,
      limit
    } = data

    let queryData = {
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.COMMENT
    }

    let queryDb = 'messagesOther';

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

// 查询访客消息
async function getVisitMessage(data) {
  try {
    let {
      openId,
      page,
      limit
    } = data;

    let queryDb = "messagesOther";
    let queryData = {
        to: openId,
        type: CONFIG.MESSAGE_OTHER_STATUS.VISIT,
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



// 查询卡片提醒
async function getCardsMessage(data) {
  try {
    let {
      openId,
      page,
      limit,
      from,
      status
    } = data;

    let queryDb = "messagesUser";
    let queryData = {
        to: openId,
        groupType: 0,
        from,
        status
    };

    let count = await db.collection(queryDb).where(queryData).count();

    let messages = (await db.collection(queryDb).aggregate()
      .match(queryData)
      .sort({
        // status: 1,
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

// 查询第一屏列表
async function getMessagesUser(data) {
  try {
    let {
      openId,
      page,
      limit
    } = data

    let count = await db.collection('messagesType').where({
      to: openId,
      status: _.neq(2)
    }).count();

    let messages = (await db.collection('messagesType').aggregate()
      .match({
        to: openId,
        status: _.neq(2)
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
// 查询第一屏列表
async function getCirclesMessage(data) {
  try {
    let {
      from,
      page,
      limit,
      openId,
      status,
    } = data

    let queryDb = "messagesUser";
    let queryData = {
        to: openId,
        groupType: from,
        status
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


exports.getNotReadCount = getNotReadCount;
exports.getChargeMessage = getChargeMessage;
exports.getCommentMessage = getCommentMessage;
exports.getVisitMessage = getVisitMessage;
exports.getMessagesUser = getMessagesUser;
exports.getCardsMessage = getCardsMessage;
exports.getCirclesMessage = getCirclesMessage;