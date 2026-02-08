// 获取圈子列表
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')
const {
  errorCode
} = require('./errorCode');

// 圈子列表动态
async function getCircleOwnerList(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command
  const $ = db.command.aggregate;

  let { limit = 20, circleId, publicTime } = event;

  if (!circleId) {
    return errorCode.LIMIT_QUERY
  }

  let owner = (await db.collection('circle').where({
    _id: circleId
  }).get()).data[0].owner;

  if (!owner || !owner.length) {
    return errorCode.NO_CIRCLE_OWNER
  }
  owner = owner[0];

  let count, result;

  let query = {
    circleId,
    openId: owner,
    dynStatus: 1,
  };

  let sort;

  // 计算总数
  count = await db.collection('dyn').where(query).count();

  // 存在查询时间
  if (publicTime) {
    query.publicTime = _.lt(publicTime);
    sort = {
      publicTime: -1,
    };
  } else {
    sort = {
      topTime: -1,
      publicTime: -1,
    }
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

exports.getCircleOwnerList = getCircleOwnerList;