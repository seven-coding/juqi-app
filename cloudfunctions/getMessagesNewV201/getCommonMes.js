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

// 查询第一屏列表（先分页取裸数据，再批量查 circle/dyn，仅对本页 id 置已读）
async function getCommonMes(data) {
  const db = getDb();
  const _ = db.command;
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

    // 仅 match + sort + skip + limit，不 lookup
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
    const updateData = { status: 1, noReadCount: 0 };
    await alreadyReadByPageIds(db, queryDb, updateData, pageIds);

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

exports.getCommonMes = getCommonMes;
