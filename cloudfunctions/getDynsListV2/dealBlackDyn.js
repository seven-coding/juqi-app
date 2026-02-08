// 处理掉被拉黑的人// 申请置顶
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  getUserInfo
} = require("./utils/userInfo")
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');

// 处理数据
async function dealBlackDyn(openId, dynList) {
  const db = cloud.database();
  // 无 openId 时不做黑名单过滤，避免 .where({ openId }) 报「查询参数对象值不能均为 undefined」
  if (openId == null || openId === '') {
    return dynList;
  }

  let authInfo = await getUserInfo(openId).auth;

  let userAuth = false;
  if (authInfo && (authInfo.admin || authInfo.superAdmin || authInfo.censor)) {
    userAuth = true;
  }

  if (!userAuth) {

    let filiterList = await getNoSeeList(openId, db)
    const blackList = await getBlackedUserList(db)
    const noSeeMeOpenIds = await getNoSeeMeOpenIds(openId, db)

    dynList = dynList.filter(item => {
      // 过滤：不看她、全站拉黑、不让她看我的
      return !!!filiterList.includes(item.openId) && !!!blackList.includes(item.openId) && !!!noSeeMeOpenIds.includes(item.openId)
    });
  }

  return dynList;

}


async function getNoSeeList(openId, db) {
  // 防御：避免 .where({ openId }) 收到 undefined 导致「查询参数对象值不能均为 undefined」
  if (openId == null || openId === '' || typeof openId !== 'string') {
    return [];
  }
  if (!db) db = cloud.database();
  let key = `${openId}_NO_SEE_LIST_V2`;

  // 查询不看列表（仅 type=1：不看她）
  let redisValue = await getRedisValue(key);
  if (redisValue) {
    console.log('命中缓存');
    redisValue = JSON.parse(redisValue);

    return redisValue;
  } else {

    let noSeeId = (await db.collection('user_no_see').where({
      openId,
      type: 1
    }).limit(1000).get()).data;

    let filiterList = noSeeId.map(item => {
      return item.noSeeId;
    })

    console.log(filiterList);

    await setRedisValue(key, JSON.stringify(filiterList))
    await setRedisExpire(key, 60 * 5)

    return filiterList
  }
}

/**
 * 谁对当前用户设置了「不让她看我的」(type=2)，返回这些人的 openId 列表
 */
async function getNoSeeMeOpenIds(openId, db) {
  if (openId == null || openId === '' || typeof openId !== 'string') {
    return [];
  }
  if (!db) db = cloud.database();
  let key = `${openId}_NO_SEE_ME_LIST`;

  let redisValue = await getRedisValue(key);
  if (redisValue) {
    redisValue = JSON.parse(redisValue);
    return redisValue;
  }

  let rows = (await db.collection('user_no_see').where({
    noSeeId: openId,
    type: 2
  }).limit(1000).get()).data;

  let openIds = rows.map(item => item.openId);
  await setRedisValue(key, JSON.stringify(openIds));
  await setRedisExpire(key, 60 * 5);
  return openIds;
}

async function getBlackedUserList(db) {
  if (!db) db = cloud.database();
  const {
    data
  } = await db.collection('user').where({
    joinStatus: -2
  }).get()
  const blackList = data.map(item => item.openId)
  return blackList
}



exports.dealBlackDyn = dealBlackDyn;