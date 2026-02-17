
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
  let result = await db.collection('user_black').where(query).count();
  console.log("拉黑状态 query: ", query, ", result: ", result);
  const count = result.total || 0;
  return count > 0;
}


// 查询AB双方拉黑关系
// 4: 双方拉黑 3: A拉黑B 2: B拉黑A 1，不拉黑
async function getABBlackStatus(event) {

  let { A_openId, B_openId } = event;

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

// // 查询A是否拉黑了B
async function getBlackStatus(A_openId, B_openId) {

  if (A_openId == B_openId) return false;
  
  const redisKey = `${A_openId}_BLACK_${B_openId}`;

  let redisResult = await getRedisValue(redisKey);

  if (!!Number(redisResult) || redisResult === 0) {
    return !!redisResult
  } else {
    let black_status = await query_dataset({
      openId: A_openId,
      blackId: B_openId,
      status: 1
    });

    // 用1和0缓存拉黑关系
    await setRedisValue(redisKey, black_status ? 1 : 0)
    await setRedisExpire(redisKey, 60 * 60 * 24)

    return !!black_status
  }
}

exports.getABBlackStatus = getABBlackStatus
exports.getBlackStatus = getBlackStatus