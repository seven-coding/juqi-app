// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;
const { getRedisValue, setRedisValue, setRedisExpire } = require('./redis')

//收藏数
async function getFavoriteCount(openId) {

  let redisKey = `${openId}_FAVIRITE_COUNT`;
  let faviriteCountRedis = await getRedisValue(redisKey);

  if (faviriteCountRedis) {
    console.log("收藏命中缓存");
    return faviriteCountRedis;
  } else {
    let updateResult = await db.collection('dynFavorite').where({
      openId,
      favoriteFlag: '0'
    }).count();

    await setRedisValue(redisKey, updateResult.total)
    await setRedisExpire(redisKey, 60 * 60 * 24 * 7);
    return updateResult.total || 0;
  }
}

// 拉黑
async function getBlackCount(openId) {

  let redisKey = `${openId}_BLACK_COUNT`;
  let faviriteCountRedis = await getRedisValue(redisKey);

  if (faviriteCountRedis) {
    console.log("拉黑命中缓存");
    return faviriteCountRedis;
  } else {
    let updateResult = await db.collection('user_black').where({
      openId,
    }).count();

    await setRedisValue(redisKey, updateResult.total)
    await setRedisExpire(redisKey, 60 * 60 * 24 * 7);
    return updateResult.total || 0;
  }
}


// 拉黑人数,邀请
async function getBlackAndInviteCount(openId) {
  let res = (await db.collection('user').aggregate()
  .match({
    openId,
  })
  // .lookup({
  //   from: 'user_secret',
  //   let: {
  //     openId: '$openId'
  //   },
  //   pipeline: $.pipeline()
  //     .match(_.expr(
  //       $.eq(['$openId', '$$openId']),
  //     ))
  //     .project({
  //       blackList: 1
  //     })
  //     .done(),
  //   as: 'usersSecret',
  // })
  .lookup({
    from: 'user',
    let: {
      openId: '$openId'
    },
    pipeline: $.pipeline()
      .match(_.expr(
        $.eq(['$inviteUser', '$$openId']),
      ))
      .done(),
    as: 'inviteUser',
  })
  .end()).list;
  if (res.length) {
    return res[0]
  } else {
    return "NOT_REGISTER"
  }
}

// 充电的帖子数/暂时注释
// async function getLikeCount(openId) {

//   let redisResult = await getRedisValue(`userlike_count_${openId}`);

//   if (redisResult) {
//     console.log('查询发布数量命中缓存：', redisResult);
//     return redisResult;
//   } else {
//     console.log('查询发布数量未命中缓存：', redisResult);

//     let likeCount = await db.collection('dyn').where({
//       like: _.all([openId]),
//     }).count()
//     await setRedisValue(`userlike_count_${openId}`,likeCount.total)
//     await setRedisExpire(`userlike_count_${openId}`, 60 * 60)

//     return likeCount.total || 0;
//   }
// }
exports.getFavoriteCount = getFavoriteCount;
// exports.getInviteCount = getInviteCount;
exports.getBlackAndInviteCount = getBlackAndInviteCount;
exports.getBlackCount = getBlackCount;
// exports.getLikeCount = getLikeCount;