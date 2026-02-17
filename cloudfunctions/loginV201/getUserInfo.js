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
} = require('./utils/redis');

// 获取用户信息
async function getUserInfo(openId, unionId, source) {
  try {
    // const queryKey = ''
    // if (source == 'app') {
    //   queryKey = "unionId"
    // } else {
    //   openId
    // }

    let redisResult = await getRedisValue(openId)
    console.log('命中缓存, redisResult', redisResult);

    if (false) {
      console.log('命中缓存');

      redisResult = JSON.parse(redisResult);
      // unionId保存
      if (!redisResult.unionId && unionId) {
        await db.collection('user').where({
          openId
        }).update({
          data: {
            unionId
          }
        })
      }

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
        await setRedisExpire(openId, 60)

        return res[0]
      } else {
        return "NOT_REGISTER"
      }

    }
  } catch (error) {
    console.log(error)
  }
}


exports.getUserInfo = getUserInfo;