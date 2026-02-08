// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

async function getUserInfo(openId) {

  let redisResult = await getRedisValue(openId)

  if (redisResult) {
    console.log('命中缓存');

    console.log(redisResult)
    redisResult = JSON.parse(redisResult);
    return redisResult;
  } else { 
    let res = (await db.collection('user').aggregate()
    .match({
      openId,
    })
    .addFields({
      usersSecret: [{
        juqiCoin: "$juqiCoin",
        juqiBuy: "$juqiBuy",
        juqiReward: "$juqiReward",
        juqiCoinUse: "$juqiCoinUse",
        vipStatus: "$vipStatus",
        vipStartTime: "$vipStartTime",
        vipEndTime: "$vipEndTime",
        vipOperateTime: "$vipOperateTime",
        avatarHat: "$avatarHat",
        avatarStatus: "$avatarStatus",
        avatarHatId: "$avatarHatId",
        volunteerStatus: "$volunteerStatus",
        volunteerNo: "$volunteerNo",
        volunteerTime: "$volunteerTime",
        partnerStatus: "$partnerStatus",
        partnerNo: "$partnerNo",
        partnerTime: "$partnerTime",
        partnerDeclaration: "$partnerDeclaration",
        avaOperateTime: "$avaOperateTime",
        avatarHatTime: "$avatarHatTime",
        dressPlace: "$dressPlace",
      }]
    })
    .end()).list;

    if (res.length) {

      await setRedisValue(openId, JSON.stringify(res[0]))
      await setRedisExpire(openId, 60 * 5)
      
      return res[0]
    } else {
      return ""
    }
  }
}

async function updateUserInfo(openId, updateInfo) {

  const result = await db.collection('user').where({
    openId
  }).update({
    data: updateInfo
  });

  // 更新目标用户电量
  await setRedisExpire(openId, 0)
  return result;
}

exports.getUserInfo = getUserInfo;
exports.updateUserInfo = updateUserInfo;