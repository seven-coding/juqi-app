
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

async function query_dataset(query) {
  // 去掉undefined
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);
  let result = await db.collection('user_followee').where(query).count();
  console.log("关注状态 query: ", query, ", result: ", result);
  const count = result.total || 0;
  return count > 0;
}

// 获取 openId 的关注列表
async function getFollowingStatus(openId1, openId2) {
  // 查询 openId1 和 openId2 的关注/粉丝关系
  let openId1_followered_openId2 = await query_dataset({
    openId: openId1,
    followeeId: openId2,
    status: 1
  });
  let openId2_followered_openId1 = (await query_dataset({
    openId: openId2,
    followeeId: openId1,
    status: 1
  }));

  let followingStatus_1to2, followingStatus_2to1;
  if (openId1_followered_openId2 && openId2_followered_openId1) {
    // 互相关注
    followingStatus_1to2 = 4;
    followingStatus_2to1 = 4;
  } else if (openId2_followered_openId1) {
    // 已关注对方，显示：已关注你
    followingStatus_1to2 = 3;
    followingStatus_2to1 = 2;
  } else if (openId1_followered_openId2) {
    // 你已关注对方
    followingStatus_1to2 = 2;
    followingStatus_2to1 = 3;
  } else {
    // 无关注
    followingStatus_1to2 = 1;
    followingStatus_2to1 = 1;
  }
  return {
    [openId1]: followingStatus_1to2,
    [openId2]: followingStatus_2to1
  }
}

// 获取某人对另外一人的关注关系
async function getFollowStatus(event) {

  let { otherOpenId, ownOpenId } = event;

  if (otherOpenId == ownOpenId) return true;

  let result = await getFollowingStatus(ownOpenId, otherOpenId);

  return result[ownOpenId];

}

// 取消关注
// double_cancel 为true表示双向取关
// double_cancel 为false表示A取关B
async function setCancelFollow(event) {

  let { A_openId, B_openID, double_cancel} = event;

  // 删除关注记录
  await db.collection('user_followee').where({
    openId: A_openId,
    followeeId: B_openID,//被关注用户的openId
  }).remove();

  await setRedisExpire(`${A_openId}_FOLLOW_${B_openID}`);

  if (double_cancel) {
    // 删除关注记录
    await db.collection('user_followee').where({
      openId: B_openID,
      followeeId: A_openId,//被关注用户的openId
    }).remove();

    await setRedisExpire(`${B_openID}_FOLLOW_${A_openId}`);
  }

  return true
}
exports.getFollowStatus = getFollowStatus
exports.setCancelFollow = setCancelFollow