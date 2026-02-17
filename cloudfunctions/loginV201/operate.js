// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');

// 获取发布动态数量
async function getPublishCount(openId) {

  let redisResult = await getRedisValue(`publish_count_${openId}`);

  if (redisResult) {
    console.log('查询发布数量命中缓存：', redisResult);
    return redisResult;
  } else {
    console.log('查询发布数量未命中缓存：', redisResult);

    let updateResult = await db.collection('dyn').where({
      openId,
      dynStatus: _.in([1, 3, 4, 5, 6, 7, 8])
    }).count();

    // 更新发布数量
    await db.collection('user').where({
      openId,
    }).update({
      data: {
        publishCount: updateResult.total
      }
    });

    await setRedisValue(`publish_count_${openId}`, updateResult.total)
    await setRedisExpire(`publish_count_${openId}`, 60 * 60 * 24)

    return updateResult.total || 0;
  }
}

// 粉丝人数
async function getFollowerNums(openId) {
  try {
    let redisResult = await getRedisValue(`befollowed_${openId}`);

    if (redisResult) {
      console.log('粉丝人数命中缓存');
      return redisResult;
    } else {
      console.log('粉丝人数未命中缓存');

      let count = (await db.collection('user_followee').where({
        followeeId: openId,
        status: 1
      }).count()).total;


      await setRedisValue(`befollowed_${openId}`, count)
      await setRedisExpire(`befollowed_${openId}`, 60 * 60)

      return count;
    }
  } catch (error) {
    console.log(error);
    return 0;
  }
}

// 关注人数
async function getFollowNums(openId) {
  try {
    let redisResult = await getRedisValue(`following_${openId}`);

    if (redisResult) {
      console.log('关注人数命中缓存');
      return redisResult;
    } else {
      console.log('关注人数未命中缓存');
      
      let count = (await db.collection('user_followee').where({
        openId,
        status: 1
      }).count()).total;

      await setRedisValue(`following_${openId}`, count)
      await setRedisExpire(`following_${openId}`, 60 * 60)

      return count;
    }
  } catch (error) {
    console.log(error);
    return 0;
  }
}

// 获取电量状态
async function getChargeStatus(data) {
  const chargeType = 2;
  const messageOtherType = 1;

  // 如果是查询他人信息，计算可充电状态
  let chargingStatus = await db.collection('messagesOther').where({
    to: data.to,
    from: data.from,
    createTime: _.gte(new Date(new Date().toLocaleDateString()).getTime()), //今天凌晨时间
    type: messageOtherType,
    chargeType
  }).get();
  // 当天是否已被电过
  return chargingStatus.data && chargingStatus.data.length ? false : true;
}



// 拉黑状态
// 4: 双方拉黑 3: 拉黑对方 2: 被对方拉黑 1: 未被拉黑
async function getBlackStatus(A_openId, B_openId) {

  // 获取拉黑信息
  let result = (await cloud.callFunction({
    name: 'commonRequestV201',
    // 传递给云函数的event参数
    data: {
      method: "get_AB_black_status",
      A_openId, 
      B_openId,
    }
  })).result;

  return result;
}

exports.getPublishCount = getPublishCount;
exports.getFollowNums = getFollowNums;
exports.getFollowerNums = getFollowerNums;
exports.getChargeStatus = getChargeStatus;
exports.getBlackStatus = getBlackStatus;