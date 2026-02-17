// 获取圈子列表
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')

// 圈子列表动态
async function getCircleHotList(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command
  const $ = db.command.aggregate;

  let { limit = 20, circleId, publicTime } = event;

  let count, result;

  let query = {
    circleId,
    dynStatus: 1,
  };

  let sort = {
    likeNums: -1,
  };

  if (query) {
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
}

exports.getCircleHotList = getCircleHotList;