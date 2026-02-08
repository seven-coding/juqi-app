// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

// 获取收藏状态
// favoriteFlag
// - 0.已收藏
// - 1.已取消收藏
// - 2.拉黑收藏失效
async function getFavoriteFlag(otherOpenId, ownOpenId, dynId) {

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