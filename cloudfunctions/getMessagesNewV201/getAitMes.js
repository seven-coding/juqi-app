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

// 查询艾特消息（先分页取裸数据，再批量查 user/dyn，仅对本页 id 置已读）
async function getAitMes(data) {
  const db = getDb();
  const _ = db.command;
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

    return {
      code: 200,
      messages,
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

exports.getAitMes = getAitMes;
