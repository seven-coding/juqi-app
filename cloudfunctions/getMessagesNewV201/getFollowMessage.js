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
const { alreadyReadByPageIds } = require('./alreadyReadUtil');


function getDb() {
  return global.__GETMESSAGESNEW_DB__ || (cloud.init(), cloud.database());
}

// 查询关注提醒（先分页取裸数据，再批量查 user，仅对本页 id 置已读）
// 可选 from：会话详情页传入对方 openId 时仅返回该用户的关注消息
async function getFollowMessage(data) {
  const db = getDb();
  const _ = db.command;
  try {
    let {
      openId,
      page,
      limit,
      status,
      from,
    } = data;

    let queryDb = "messagesUser";
    let queryData = {
      to: openId,
      groupType: 1,
      status,
    };
    if (from) {
      queryData.from = from;
    }

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
    const userRes = fromIds.length ? await db.collection('user').where({ openId: _.in(fromIds) }).get() : { data: [] };
    const userMap = (userRes.data || []).reduce((acc, u) => { acc[u.openId] = u; return acc; }, {});

    const messages = list.map(m => ({
      ...m,
      userInfo: m.from && userMap[m.from] ? [userMap[m.from]] : []
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

exports.getFollowMessage = getFollowMessage;
