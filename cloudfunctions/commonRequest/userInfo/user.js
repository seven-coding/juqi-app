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
} = require('../redis');

// 获取User表
async function getUserInfo(openId) {

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

// 更新User表
async function setUserInfo(event) {
  let {
    openId,
    setUserInfo
  } = event;

  const result = await db.collection('user').where({
    openId
  }).update({
    data: setUserInfo
  });

  // 更新目标用户电量
  await setRedisExpire(openId, 0)
  return result;
}

async function addUserInfo(event) {


  let {
    registerPath,
    openId,
    inviteUser
  } = event;

  const {
    data
  } = await db.collection('user').where({
    openId
  }).get()
  if (data && data.length > 0) {
    return data[0]
  }

  let joinSort = (await db.collection('config').doc("6d85a2b9627c1aae035a956d12ea9139").get()).data.user_number + 1;
  // async update user_number

  await db.collection('config').doc("6d85a2b9627c1aae035a956d12ea9139").update({
    data: {
      user_number: _.inc(1)
    }
  });

  // 默认头像
  const avatarUrl = "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/circles/1_love.jpeg";

  // 初始化信息
  let profile = {
    avatarUrl,
    city: "",
    country: "",
    gender: "",
    language: "",
    nickName: "充电宝" + joinSort,
    openId,
    provinc: "",
    auth: {
      admin: false,
      partner: false,
      volunteer: false,
      verifier: false,
      circleManager: false,
      censor: false,
      superAdmin: false,
      roomManager: false
    },
    tag: ["普通用户"],
    tagOnShow: "普通用户",
    firstEnterTime: db.serverDate(),
    joinStatus: 0,
    imgList: [],
    circles: [],
    joinSort,
    inviteUser,
    juqiCoin: 0,
    juqiBuy: 0,
    juqiReward: 0,
    juqiCoinUse: 0,
    vipStatus: false,
    vipConfig: {
      showVisit: true, //来访消息打开
      showFollow: true, //关注列表
      showFollower: true, //粉丝列表 
      showCharge: false, //充电列表 ,
      restStatus: false
    },
    registerPath, //来源路径
  }

  await db.collection('user').add({
    data: profile
  });

  return profile
}

exports.getUserInfo = getUserInfo;
exports.setUserInfo = setUserInfo;
exports.addUserInfo = addUserInfo;