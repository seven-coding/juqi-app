// 是否被对方拉黑
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');

async function query_dataset(query, limit = 20, project = {}) {
  // 去掉undefined
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

  let list = (await db.collection('user_black')
    .aggregate()
    .match(query)
    .limit(limit)
    .end()).list;

  console.log(query)
  console.log(list)

  return list;
}

// 是否被拉黑
async function userAuth(ownOpenId, otherOpenId) {
  if (ownOpenId == otherOpenId) {
    return true
  }


  //   // 查询拉黑状态
  //   let followStatus = (await db.collection('user_black').where(_.or([
  //     {
  //       openId: otherOpenId,
  //       blackId: ownOpenId
  //     },
  //     {
  //       openId: ownOpenId,
  //       blackId: otherOpenId
  //     },
  //   ])).get()).data.length > 0;

  //   if (followStatus) {
  //     return false
  // =======


  // 获取拉黑信息
  let result = await getABBlackStatus({
    A_openId: ownOpenId,
    B_openId: otherOpenId,
  });

  return result;
}

// // 查询A是否拉黑了B
async function getBlackStatus(A_openId, B_openId) {

  if (A_openId == B_openId) return false;


  const redisKey = `${A_openId}_BLACK_${B_openId}`;

  let redisResult = await getRedisValue(redisKey);

  if (!!Number(redisResult) || redisResult === 0) {
    return !!redisResult
  } else {
    let black_status = (await query_dataset({
      openId: A_openId,
      blackId: B_openId,
      status: 1
    })).length > 0;

    // 用1和0缓存拉黑关系
    await setRedisValue(redisKey, black_status ? 1 : 0)
    await setRedisExpire(redisKey, 60 * 60 * 24)

    return !!black_status
  }
}


// 查询AB双方拉黑关系
// 4: 双方拉黑 3: A拉黑B 2: B拉黑A 1，不拉黑
async function getABBlackStatus(event) {

  let {
    A_openId,
    B_openId
  } = event;

  if (A_openId == B_openId) return false;

  let A_result = await getBlackStatus(A_openId, B_openId);
  let B_result = await getBlackStatus(B_openId, A_openId);

  if (A_result && B_result) {
    return 4;
  } else if (A_result) {
    return 3
  } else if (B_result) {
    return 2
  } else {
    return 1
  }
}



exports.userAuth = userAuth;