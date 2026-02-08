// 查询收藏动态
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealFavoriteDynListData } = require('./dealData.js')

async function getFavoriteDynList(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command

  let { limit = 20, publicTime } = event;

  let count, result;

  let query = {
    openId: ownOpenId,
    favoriteFlag: '0',
  }
  let sort = {
    createDate: -1,
  };

  // 计算总数
  count = await db.collection('dynFavorite').where(query).count();

  // 存在查询时间
  if (publicTime) {
    query.createDate = _.lt(publicTime);
  }

  result = await dealFavoriteDynListData(query, sort, limit, ownOpenId);

  return {
    code: 200,
    dynList: result.list,
    count: count.total,
    publicTime: result.createDate
  };

}

exports.getFavoriteDynList = getFavoriteDynList;