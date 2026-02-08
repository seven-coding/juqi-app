// 处理掉被拉黑的人// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate;
const {
  getUserInfo
} = require("../utils/userInfo")
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('../utils/redis');

// 处理数据
async function dealBlackDyn(openId, dynList) {

  let authInfo = await getUserInfo(openId).auth;

  let userAuth = false;
  if (authInfo && (authInfo.admin || authInfo.superAdmin || authInfo.censor)) {
    userAuth = true;
  }

  if (!userAuth) {

    let filiterList = await getNoSeeList(openId)
    const blackList = await getBlackedUserList()

    dynList = dynList.filter(item => {
      // 过滤个人用户的黑名单和全站拉黑名单
      return !!!filiterList.includes(item.openId) && !!!blackList.includes(item.openId)
    });
  }

  return dynList;

}


async function getNoSeeList(openId) {
  let key = `${openId}_NO_SEE_LIST`;

  // 查询不看列表
  let redisValue = await getRedisValue(key);
  if (redisValue) {
    console.log('命中缓存');
    redisValue = JSON.parse(redisValue);

    return redisValue;
  } else {

    let noSeeId = (await db.collection('user_no_see').where({
      openId,
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

async function getBlackedUserList() {
  const {
    data
  } = await db.collection('user').where({
    joinStatus: -2
  }).get()
  const blackList = data.map(item => item.openId)
  return blackList
}



exports.dealBlackDyn = dealBlackDyn;