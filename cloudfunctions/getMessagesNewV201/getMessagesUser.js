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

// 查询第一屏列表（支持 dataEnv：使用 global.__GETMESSAGESNEW_DB__ 时读指定环境）
function getDb() {
  return global.__GETMESSAGESNEW_DB__ || (cloud.init(), cloud.database());
}

// 先分页取 messagesType 一页文档（不含 lookup），再并行 count + 批量查 circle/dyn/messagesUser/user，目标 1 秒内返回
async function getMessagesUser(data) {
  const db = getDb();
  const _ = db.command;
  const $ = db.command.aggregate;
  try {
    const { openId, page, limit } = data;
    console.log('enter getMessagesUser');

    // 第一步：先取一页列表（依赖 messagesType 复合索引 to+status+createTime）
    const listRes = await db.collection('messagesType').aggregate()
      .match({ to: openId, status: _.in([0, 1]) })
      .sort({ status: 1, createTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .end();
    const list = (listRes && (listRes.list || listRes.data)) || [];
    if (list.length === 0) {
      const countRes = await db.collection('messagesType').where({ to: openId, status: _.in([0, 1]) }).count();
      return { code: 200, messages: [], count: countRes.total || 0 };
    }

    // 第二步：并行 count + 4 个批量 get，缩短总耗时
    const circleIds = [...new Set(list.map(m => m.from).filter(Boolean))];
    const messageUserIds = [...new Set(list.map(m => m.messageUserId).filter(Boolean))];
    const dynIds = [...new Set(list.map(m => m.dynId).filter(Boolean))];
    const fromIds = [...new Set(list.map(m => m.from).filter(Boolean))];

    const [countRes, circleList, messageUserList, dynList, userList] = await Promise.all([
      db.collection('messagesType').where({ to: openId, status: _.in([0, 1]) }).count(),
      circleIds.length ? db.collection('circle').where({ _id: _.in(circleIds) }).get() : Promise.resolve({ data: [] }),
      messageUserIds.length ? db.collection('messagesUser').where({ _id: _.in(messageUserIds) }).get() : Promise.resolve({ data: [] }),
      dynIds.length ? db.collection('dyn').where({ _id: _.in(dynIds) }).get() : Promise.resolve({ data: [] }),
      fromIds.length ? db.collection('user').where({ openId: _.in(fromIds) }).get() : Promise.resolve({ data: [] })
    ]);
    const total = countRes.total || 0;
    console.log('enter getMessagesUser count', total);

    const circleMap = (circleList.data || []).reduce((acc, c) => { acc[c._id] = c; return acc; }, {});
    const messageUserMap = (messageUserList.data || []).reduce((acc, u) => { acc[u._id] = u; return acc; }, {});
    const dynMap = (dynList.data || []).reduce((acc, d) => { acc[d._id] = d; return acc; }, {});
    const userMap = (userList.data || []).reduce((acc, u) => { acc[u.openId] = u; return acc; }, {});

    // 第四步：拼装成与原有聚合一致的形状（circles/user/messageInfo/dyn 为数组以兼容客户端）
    const messages = list.map(m => {
      const circles = m.from && circleMap[m.from] ? [circleMap[m.from]] : [];
      const messageInfo = m.messageUserId && messageUserMap[m.messageUserId] ? [messageUserMap[m.messageUserId]] : [];
      const dyn = m.dynId && dynMap[m.dynId] ? [dynMap[m.dynId]] : [];
      const user = m.from && userMap[m.from] ? [userMap[m.from]] : [];
      return { ...m, circles, messageInfo, dyn, user };
    });

    return { code: 200, messages, count: total };
  } catch (error) {
    console.error('[getMessagesUser] 查询失败', error && error.message, error && error.stack);
    return {
      code: 400,
      message: '查询失败',
      errorMsg: (error && error.message) ? String(error.message) : ''
    };
  }
}

exports.getMessagesUser = getMessagesUser;
