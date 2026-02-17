// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

const {
  getFavoriteCount,
  // getLikeCount,
  getBlackCount
} = require('operate');
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis')
const {
  getUserInfo
} = require("getUserInfo")

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


async function getInviteNums(openId) {
  const {
    total
  } = await db.collection('user').where({
    inviteUser: openId
  }).count()
  return total
}

// 给动态点赞
async function getUserOtherInfo(type, openId) {
  // 查询自己的信息
  let favoriteCount, likeCount;
  // 统计收藏数
  favoriteCount = await getFavoriteCount(openId);
  // 充电的帖子数 暂时注释
  // likeCount = await getLikeCount(openId);
  // 收藏数,邀请人数,拉黑人数
  let userInfo = await getUserInfo(openId);
  if (userInfo == "NOT_REGISTER") {
    return '';
  }

  let blackCount = await getBlackCount(openId);

  // 计算本人发布数量、关注数
  userInfo.publishCount = await getPublishCount(openId);


  userInfo.favoriteCount = favoriteCount; //收藏数
  userInfo.inviteCount = await getInviteNums(openId); //邀请人数
  userInfo.blackCount = blackCount; //拉黑人数
  // userInfo.likeCount = likeCount; // 暂时注释 充电帖子数

  userInfo.followerNums = await getFollowerNums(openId)
  userInfo.followNums = await getFollowNums(openId)

  return {
    openId,
    data: userInfo
  }
}

exports.getUserOtherInfo = getUserOtherInfo;

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
    await setRedisExpire(`publish_count_${openId}`, 60 * 60 * 24 * 7)

    return updateResult.total || 0;
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