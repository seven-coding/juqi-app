// 获取加入电站
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')


// 获取广场列表动态
async function getFocueCirlce(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command
  const $ = db.command.aggregate;

  let { limit = 20, publicTime } = event;

  let circles = (await db.collection('user').where({
    openId: ownOpenId
  }).get()).data[0].circles;
  console.log(circles);

  if (!circles || !circles.length) {
    // 还没有关注的人
    return {
      code: 200,
      dynList: [],
    }
  }

  let count, result;
  // 风险控制在1
  let query = {
    circleId: _.in(circles),
    dynStatus: 1,
  }

  sort = {
    publicTime: -1,
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

exports.getFocueCirlce = getFocueCirlce;