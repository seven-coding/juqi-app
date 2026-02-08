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

// 给动态点赞
async function getUserInfo(openId) {

  let redisResult = await getRedisValue(openId)
  console.log('命中缓存, redisResult', redisResult);

  if (redisResult) {
    console.log('命中缓存');
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


    await setRedisValue(openId, JSON.stringify(res[0]))
    await setRedisExpire(openId, 60)

    return res[0]
  }
}


exports.getUserInfo = getUserInfo;