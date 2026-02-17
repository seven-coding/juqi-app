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
const { alreadyReadByPageIds } = require('./alreadyReadUtil');

function getDb() {
  return global.__GETMESSAGESNEW_DB__ || (cloud.init(), cloud.database());
}

// 获取未读数量（5 类并行 count，依赖 messagesOther 索引）
async function getNotReadCount(openId) {
  const db = getDb();
  const _ = db.command;
  try {
    const [
      visitorNums,
      commentNums,
      chargeNums,
      aitType1Nums,
      aitType2Nums
    ] = await Promise.all([
      db.collection('messagesOther').where({
        to: openId,
        type: CONFIG.MESSAGE_OTHER_STATUS.VISIT,
        status: 0,
      }).count(),
      db.collection('messagesOther').where({
        to: openId,
        type: CONFIG.MESSAGE_OTHER_STATUS.COMMENT,
        status: 0
      }).count(),
      db.collection('messagesOther').where({
        to: openId,
        type: CONFIG.MESSAGE_OTHER_STATUS.CHARGE,
        status: 0
      }).count(),
      db.collection('messagesOther').where({
        to: openId,
        type: CONFIG.MESSAGE_OTHER_STATUS.AIT,
        status: 0,
        aitType: 1
      }).count(),
      db.collection('messagesOther').where({
        to: openId,
        type: CONFIG.MESSAGE_OTHER_STATUS.AIT,
        status: 0,
        aitType: 2
      }).count()
    ]);

    return {
      visitorNums,
      commentNums,
      chargeNums,
      aitType2Nums,
      aitType1Nums
    }
  } catch (error) {
    console.log(error)
    return {}
  }
}

// 查询电量消息（先分页取裸数据，再批量查 user/dyn，仅对本页 id 置已读）
async function getChargeMessage(data) {
  const db = getDb();
  const _ = db.command;
  try {
    let { openId, page, limit } = data;
    let queryData = {
      to: openId,
      type: CONFIG.MESSAGE_OTHER_STATUS.CHARGE,
    };

    let count = await db.collection('messagesOther').where(queryData).count();
    let listRes = await db.collection('messagesOther').aggregate()
      .match(queryData)
      .sort({ status: 1, createTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .end();
    const list = listRes.list || [];
    if (list.length === 0) {
      return { code: 200, messages: [], count: count.total };
    }

    const pageIds = list.map(m => m._id).filter(Boolean);
    await alreadyReadByPageIds(db, 'messagesOther', { status: 1, noReadCount: 0 }, pageIds);

    const fromIds = [...new Set(list.map(m => m.from).filter(Boolean))];
    const dynIds = [...new Set(list.map(m => m.dynId).filter(Boolean))];
    const [userRes, dynRes] = await Promise.all([
      fromIds.length ? db.collection('user').where({ openId: _.in(fromIds) }).get() : Promise.resolve({ data: [] }),
      dynIds.length ? db.collection('dyn').where({ _id: _.in(dynIds) }).get() : Promise.resolve({ data: [] })
    ]);
    const userMap = (userRes.data || []).reduce((acc, u) => { acc[u.openId] = u; return acc; }, {});
    const dynMap = (dynRes.data || []).reduce((acc, d) => { acc[d._id] = d; return acc; }, {});

    const messages = list.map(m => ({
      ...m,
      userInfo: m.from && userMap[m.from] ? [userMap[m.from]] : [],
      dyn: m.dynId && dynMap[m.dynId] ? [dynMap[m.dynId]] : []
    }));

    return { code: 200, messages, count: count.total };
  } catch (error) {
    console.log(error);
    return { code: 400, message: '查询失败', error: error };
  }
}

// 查询评论消息（先分页取裸数据，再批量查 user/dyn，仅对本页 id 置已读）
async function getCommentMessage(data) {
  const db = getDb();
  const _ = db.command;
  try {
    let { openId, page, limit } = data;
    let queryData = { to: openId, type: CONFIG.MESSAGE_OTHER_STATUS.COMMENT };
    let queryDb = 'messagesOther';

    let count = await db.collection(queryDb).where(queryData).count();
    let listRes = await db.collection(queryDb).aggregate()
      .match(queryData)
      .sort({ status: 1, createTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .end();
    const list = listRes.list || [];
    if (list.length === 0) {
      return { code: 200, messages: [], count: count.total };
    }

    const pageIds = list.map(m => m._id).filter(Boolean);
    await alreadyReadByPageIds(db, queryDb, { status: 1, noReadCount: 0 }, pageIds);

    const fromIds = [...new Set(list.map(m => m.from).filter(Boolean))];
    const dynIds = [...new Set(list.map(m => m.dynId).filter(Boolean))];
    const [userRes, dynRes] = await Promise.all([
      fromIds.length ? db.collection('user').where({ openId: _.in(fromIds) }).get() : Promise.resolve({ data: [] }),
      dynIds.length ? db.collection('dyn').where({ _id: _.in(dynIds) }).get() : Promise.resolve({ data: [] })
    ]);
    const userMap = (userRes.data || []).reduce((acc, u) => { acc[u.openId] = u; return acc; }, {});
    const dynMap = (dynRes.data || []).reduce((acc, d) => { acc[d._id] = d; return acc; }, {});

    const messages = list.map(m => ({
      ...m,
      userInfo: m.from && userMap[m.from] ? [userMap[m.from]] : [],
      dyn: m.dynId && dynMap[m.dynId] ? [dynMap[m.dynId]] : []
    }));

    return { code: 200, messages, count: count.total };
  } catch (error) {
    console.log(error);
    return { code: 400, message: '查询失败', error: error };
  }
}

// 查询访客消息（operate 内版本，先分页取裸数据，再批量查 user/dyn，仅对本页 id 置已读）
async function getVisitMessage(data) {
  const db = getDb();
  const _ = db.command;
  try {
    let { openId, page, limit } = data;
    let queryDb = "messagesOther";
    let queryData = { to: openId, type: CONFIG.MESSAGE_OTHER_STATUS.VISIT };

    let count = await db.collection(queryDb).where(queryData).count();
    let listRes = await db.collection(queryDb).aggregate()
      .match(queryData)
      .sort({ status: 1, createTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .end();
    const list = listRes.list || [];
    if (list.length === 0) {
      return { code: 200, messages: [], count: count.total };
    }

    const pageIds = list.map(m => m._id).filter(Boolean);
    await alreadyReadByPageIds(db, queryDb, { status: 1, noReadCount: 0 }, pageIds);

    const fromIds = [...new Set(list.map(m => m.from).filter(Boolean))];
    const dynIds = [...new Set(list.map(m => m.dynId).filter(Boolean))];
    const [userRes, dynRes] = await Promise.all([
      fromIds.length ? db.collection('user').where({ openId: _.in(fromIds) }).get() : Promise.resolve({ data: [] }),
      dynIds.length ? db.collection('dyn').where({ _id: _.in(dynIds) }).get() : Promise.resolve({ data: [] })
    ]);
    const userMap = (userRes.data || []).reduce((acc, u) => { acc[u.openId] = u; return acc; }, {});
    const dynMap = (dynRes.data || []).reduce((acc, d) => { acc[d._id] = d; return acc; }, {});

    const messages = list.map(m => ({
      ...m,
      userInfo: m.from && userMap[m.from] ? [userMap[m.from]] : [],
      dyn: m.dynId && dynMap[m.dynId] ? [dynMap[m.dynId]] : []
    }));

    return { code: 200, messages, count: count.total };
  } catch (error) {
    console.log(error);
    return { code: 400, message: '查询失败', error: error };
  }
}



// 查询卡片提醒（先分页取裸数据，再批量查 user，仅对本页 id 置已读）
async function getCardsMessage(data) {
  const db = getDb();
  const _ = db.command;
  try {
    let { openId, page, limit, from, status } = data;
    let queryDb = "messagesUser";
    let queryData = { to: openId, groupType: 0, from, status };

    let count = await db.collection(queryDb).where(queryData).count();
    let listRes = await db.collection(queryDb).aggregate()
      .match(queryData)
      .sort({ createTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .end();
    const list = listRes.list || [];
    if (list.length === 0) {
      return { code: 200, messages: [], count: count.total };
    }

    const pageIds = list.map(m => m._id).filter(Boolean);
    await alreadyReadByPageIds(db, queryDb, { status: 1, noReadCount: 0 }, pageIds);

    const fromIds = [...new Set(list.map(m => m.from).filter(Boolean))];
    const userRes = fromIds.length ? await db.collection('user').where({ openId: _.in(fromIds) }).get() : { data: [] };
    const userMap = (userRes.data || []).reduce((acc, u) => { acc[u.openId] = u; return acc; }, {});

    const messages = list.map(m => ({
      ...m,
      userInfo: m.from && userMap[m.from] ? [userMap[m.from]] : []
    }));

    return { code: 200, messages, count: count.total };
  } catch (error) {
    console.log(error);
    return { code: 400, message: '查询失败', error: error };
  }
}

// 查询第一屏列表（operate 内版本）
async function getMessagesUser(data) {
  const db = getDb();
  const _ = db.command;
  const $ = db.command.aggregate;
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
// 查询电站消息（先分页取裸数据，再批量查 circle/dyn，仅对本页 id 置已读）
async function getCirclesMessage(data) {
  const db = getDb();
  const _ = db.command;
  try {
    let { from, page, limit, openId, status } = data;
    let queryDb = "messagesUser";
    let queryData = { to: openId, groupType: from, status };

    let count = await db.collection(queryDb).where(queryData).count();
    let listRes = await db.collection(queryDb).aggregate()
      .match(queryData)
      .sort({ createTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .end();
    const list = listRes.list || [];
    if (list.length === 0) {
      return { code: 200, messages: [], count: count.total };
    }

    const pageIds = list.map(m => m._id).filter(Boolean);
    await alreadyReadByPageIds(db, queryDb, { status: 1, noReadCount: 0 }, pageIds);

    const circleIds = [...new Set(list.map(m => m.from).filter(Boolean))];
    const dynIds = [...new Set(list.map(m => m.dynId).filter(Boolean))];
    const [circleRes, dynRes] = await Promise.all([
      circleIds.length ? db.collection('circle').where({ _id: _.in(circleIds) }).get() : Promise.resolve({ data: [] }),
      dynIds.length ? db.collection('dyn').where({ _id: _.in(dynIds) }).get() : Promise.resolve({ data: [] })
    ]);
    const circleMap = (circleRes.data || []).reduce((acc, c) => { acc[c._id] = c; return acc; }, {});
    const dynMap = (dynRes.data || []).reduce((acc, d) => { acc[d._id] = d; return acc; }, {});

    const messages = list.map(m => ({
      ...m,
      circle: m.from && circleMap[m.from] ? [circleMap[m.from]] : [],
      dyns: m.dynId && dynMap[m.dynId] ? [dynMap[m.dynId]] : []
    }));

    return { code: 200, messages, count: count.total };
  } catch (error) {
    console.log(error);
    return { code: 400, message: '查询失败', error: error };
  }
}


exports.getNotReadCount = getNotReadCount;
exports.getChargeMessage = getChargeMessage;
exports.getCommentMessage = getCommentMessage;
exports.getVisitMessage = getVisitMessage;
exports.getMessagesUser = getMessagesUser;
exports.getCardsMessage = getCardsMessage;
exports.getCirclesMessage = getCirclesMessage;