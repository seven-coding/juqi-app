// 取消拉黑用户
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('../errorCode');
const { setFavoriteDynFlag } = require('../utils/setFavoriteDynFlag');
const {
  setRedisExpire
} = require('../utils/redis');

async function unblackUser(event) {

  const wxContext = cloud.getWXContext();
  const openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let { unBlackId } = event;
  if (!unBlackId) {
    return errorCode.LIMIT_QUERY
  }

  let result = await db.collection('user_black').where({
    openId,
    blackId: unBlackId,
  }).remove();

  console.log(result);

  if (result.errMsg == "collection.remove:ok") {
    // 同步移除「不看她」记录（拉黑时 setNoSee 写入的 type=1），取消拉黑后对方帖子重新可见
    await db.collection('user_no_see').where({
      openId,
      noSeeId: unBlackId,
      type: 1
    }).remove();

    await setFavoriteDynFlag(openId, unBlackId, '0');
  }

  // 删除拉黑缓存
  const redisKey = `${openId}_BLACK_${unBlackId}`;
  await setRedisExpire(redisKey, 0);
  // 不看列表缓存（含 getDynsListV2 使用的 _V2 key），下次进列表会重新查库
  await setRedisExpire(`${openId}_NO_SEE_LIST`, 0);
  await setRedisExpire(`${openId}_NO_SEE_LIST_V2`, 0);

  if (result.errMsg == "collection.remove:ok") {
    return errorCode.UNBLACK_SUCCESS;
  } else {
    return errorCode.UPDATE_ERROR;
  }
}

exports.unblackUser = unblackUser;


async function getBlackStatus(openId, blackId) {
  // 获取拉黑信息
  let result = (await cloud.callFunction({
    name: 'commonRequestV201',
    // 传递给云函数的event参数
    data: {
      method: "get_black_status",
      A_openId: openId,
      B_openId: blackId 
    }
  })).result;

  return result;
}