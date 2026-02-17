// 查询新动态
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')

// 获取用户列表动态
async function getAdminDyns(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command

  let { limit = 20, openId, publicTime } = event;

  let count, result;

  // 管理员查询所有可见帖子
  let query = {
    openId,
  }

  let sort;
  if (publicTime) {
    sort = {
      publicTime: -1,
    };
  } else {
    sort = {
      userTopTime: -1,
      publicTime: -1,
    };
  }

  // 计算总数
  count = await db.collection('dyn').where(query).count();

  // 存在查询时间
  if (publicTime) {
    query.publicTime = _.lt(publicTime);
  }

  result = await dealData(query, sort, limit, ownOpenId);

  return {
    code: 200,
    dynList: result.list,
    openId: ownOpenId,
    count: count.total,
    publicTime: result.publicTime
  };
}

exports.getAdminDyns = getAdminDyns;