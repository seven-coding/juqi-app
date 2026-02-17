// 发布待验证帖子（使用 env.getDb 按 dataEnv 写库）
const cloud = require('wx-server-sdk');
const { getDb } = require('./env');
const {
  CONFIG
} = require('./config')
const {
  setMessagesUser
} = require('./messages')
const {
  publicDyn,
} = require('./operate')
const {
  errorCode
} = require('./errorCode')

async function sendVerifyDyns(event, openId, circleInfo) {
  const db = getDb();
  const _ = db.command;
  // dynVoice 语音文件地址
  // dynContent验证选择项
  console.log("发送语音验证帖子")
  let { dynVoice, dynContent, dynVoiceLen } = event;

  if (dynVoice && dynVoice.errCode) {
    return errorCode.VOICE_ERRROR
  }


  await db.collection('user').where({
    openId
  }).update({
    data: {
      // 表示指示数据库将字段自增 10
      joinStatus: 3,
      sendVerifyTime: db.serverDate()
    }
  })

  let message = "为了保证橘气社区的安全性，避免无关骚扰，橘气平台将采用严格的语音验证方式验证你的身份。\
  你的语音帖已成功发布在 [新人报到区] 。已验证的橘气用户对该条语音的充电行为将计入通过量指标。通过量到3即可解除待验证状态，开放所有权限。\
  在此期间除[新人报到区]以外的电站暂无浏览与发布权限，请耐心等待哦~";
  
  let from = "3dfe72d65fab8647008a91d506bd1290"
  // 消息记录
  setMessagesUser({
    from,
    to: openId,
    status: 0,
    type: CONFIG.MESSAGES_USER_TYPE.SYSTEM,
    groupType: CONFIG.GROUP_TYPE.SYSTEM,
    createTime: new Date().valueOf(),
    message,
    fromName: '橘卡丘',
    fromPhoto: "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png",
    secondName: "橘卡丘",
    secondPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png',
    secondMes: message,
  })

  let result = await publicDyn({
    dynContent,
    openId: openId,
    dynVoice,
    isDelete: 0, //是否删除
    likeNums: 0,
    commentNums: 0,
    circleId: "08c0d57d635b4413003aed4f3a5fb06c",
    circleTitle: "新人区",
    publicTime: new Date().valueOf(),
    dynStatus: 5,
    verifyStatus: 1,
    dynVoiceLen,
    userTopTime:0,
  }, circleInfo)

  console.log("发送成功")
  return result;
}


exports.sendVerifyDyns = sendVerifyDyns;