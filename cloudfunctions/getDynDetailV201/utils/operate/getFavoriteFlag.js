// 不在此处 cloud.init()，由 index.js 按 event.envId 初始化，避免查错库 404
const cloud = require('wx-server-sdk');

// 获取收藏状态
// favoriteFlag
// - 0.已收藏
// - 1.已取消收藏
// - 2.拉黑收藏失效
async function getFavoriteFlag(otherOpenId, ownOpenId, dynId) {
  const db = cloud.database();
  // if (otherOpenId == ownOpenId) return true;
  let favoriteFlag;
  let favoriteData = (await db.collection('dynFavorite').where({
    openId: ownOpenId,
    dynId: dynId
  }).get()).data;
  //未收藏的情况
  if (favoriteData == undefined || !favoriteData || favoriteData.length == 0) {
    favoriteFlag = '1';
  } else {
    favoriteFlag = favoriteData[0].favoriteFlag
  }
  return favoriteFlag;
}


exports.getFavoriteFlag = getFavoriteFlag;