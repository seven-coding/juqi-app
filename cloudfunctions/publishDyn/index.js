// 发布动态接口第二版
// type: 2 语音验证
// dynType： 2 转发
const cloud = require('wx-server-sdk')
cloud.init({ traceUser: true })
const db = cloud.database()
const {errorCode} = require('./errorCode')

const { CONFIG} = require('./config')
const {sendAitMessage} = require('./sendAitMessage')
const {sendVerifyDyns} = require('./sendVerifyDyns')
const {sendSecretDyns} = require('./sendSecretDyns')
const {sendNormalDyn} = require('./sendNormalDyn')
const {delKey} = require('./utils/redis');
const {getUserInfo} = require('./utils/userInfo');
const {getCircle} = require('./utils/circle');

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  let openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;
  console.log(1)
  
  let {
    type,
    dynContent,
    circleId,
  } = event;

  console.log(event)

  // 个人发布数量失效
  await delKey(`publish_count_${openId}`, 0)
  console.log(`publish_count_${openId}`)
  // 权限判断
  let userInfo = await getUserInfo(openId);
  let joinStatus = userInfo.joinStatus;
  if (!userInfo || joinStatus == -1 || joinStatus == -2) {
    // 已注销或者封禁无法发帖
    return errorCode.NO_AUTH;
  }

  // 发布圈子权限
  if (type == 2) {
    circleId = "aa133ce55f52335900c50c9626857df6";
  }

  let circleInfo = await getCircle(circleId);
  //发布数量缓存失效
  await invalidateDynamicsCache(circleId, openId);

  console.log(123123)
  if (type == 2 || type == 3) {
    // 发布待验证帖子
    return await sendVerifyDyns(event, openId, circleInfo);
  } else if (circleInfo.isSecret) {
    // 发布私密圈子
    return await sendSecretDyns(event, openId, circleInfo);
  } else if (joinStatus == 1) {
    return await sendNormalDyn(event, openId, circleInfo);
  } else {
    return errorCode.NO_AUTH;
  }
}


async function invalidateDynamicsCache(circleId, openId) {
  await delKey(`publish_count_${openId}`, 0);
  await delKey(`NEW_DYN_${circleId.split(8)[0]}`);
  await delKey(`SQUARE_DYN_Square_LIST`);
}