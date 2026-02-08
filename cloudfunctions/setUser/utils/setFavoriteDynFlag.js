const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

// 拉黑后收藏动态失效
async function setFavoriteDynFlag(openId, blackId, favoriteFlag) {
  // 0:已收藏 1:取消收藏 2：拉黑后收藏失效
  let selectType;
  if (favoriteFlag === '2') {
    selectType = '0';
  } else {
    selectType = '2'
  }
  // 查询收藏过的动态
  let hasUserFavoriteDyn = (await db.collection('dynFavorite').where({
    upOpenId: blackId,
    openId: openId,
    favoriteFlag: selectType
  }).get()).data;

  // 存在则更新
  if (hasUserFavoriteDyn || hasUserFavoriteDyn.length > 0) {
    await db.collection('dynFavorite').where({
      upOpenId: blackId,
      openId: openId,
      favoriteFlag: selectType
    }).update({
      data: {
        favoriteFlag: favoriteFlag,
        updateDate: new Date().valueOf()
      }
    });
  }
  return;

}
exports.setFavoriteDynFlag = setFavoriteDynFlag;