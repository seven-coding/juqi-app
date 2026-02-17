// 获取推荐动态
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  formatDate
} = require('./formatDate.js')
const { dealData } = require('./dealData.js')

// 获取精华贴
async function getRecomDyns(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command

  let { limit = 20, publicTime } = event;

  let count, result;
  // 风险控制在1
  let query = {
    dynStatus: 1,
    publicTime: publicTime ? _.lt(publicTime) : _.lt(new Date().valueOf()),
    isBest: 1,
  };

  let sort = { publicTime: -1 };

  count = await db.collection('dyn').where(query).count();

  result = await dealData(query, sort, limit, ownOpenId);

  return {
    code: 200,
    dynList: result.list,
    openId: ownOpenId,
    count: count.total,
    publicTime: result.publicTime
  };
}

exports.getRecomDyns = getRecomDyns;