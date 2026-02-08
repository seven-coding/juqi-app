// 申请置顶
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

// 获取User表
async function getUserInfo(openId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command;
  const $ = db.command.aggregate;

  let redisResult = await getRedisValue(openId)

  if (redisResult) {
    console.log('命中缓存');
    try {
      redisResult = JSON.parse(redisResult);
      if (redisResult) {
        return redisResult;
      }
    } catch (err) {
      console.error('[getUserInfo] Redis缓存JSON解析失败:', err);
      // 继续执行数据库查询
    }
  }
  
  if (!redisResult) { 
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


exports.getUserInfo = getUserInfo;