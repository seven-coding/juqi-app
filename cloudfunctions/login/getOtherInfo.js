const cloud = require('wx-server-sdk')
cloud.init()

const { getUserInfo } = require('./getUserInfo');
const { getABBlackStatus } = require('./utils/getBlackStatus');
const { getFollowStatus } = require('./utils/getFollowStatus');

const {
  getChargeStatus,
  getBlackStatus,
  getFollowerNums,
  getFollowNums,
} = require('operate');


const { setVisitMsg } = require('./setVisitMsg');

async function getOtherInfo(ownOpenId, openId, action) {

  console.log('1:访问别人')
  console.log('openId: ' + openId + ', ownOpenId: ' + ownOpenId);

  let userInfo = await getUserInfo(openId);
  if (userInfo == "NOT_REGISTER") {
    return errorCode.NOT_REGISTER;
  }

  let blackStatus = await getABBlackStatus({
    A_openId: ownOpenId,
    B_openId: openId
  })
  console.log('blackStatus: ', blackStatus);
  userInfo.blackStatus = blackStatus;

  if (userInfo.joinStatus == 1 && (blackStatus == 1 || blackStatus == 3) && action == 'user') {
    // 记录足迹
    await setVisitMsg(openId, ownOpenId)
  }
  
  // 计算这个人的粉丝数
  userInfo.followerNums = await getFollowerNums(openId);

  // 这个人的关注数
  userInfo.followNums = await getFollowNums(openId);

  // 我对这个人的充电状态
  let chargingStatus = await getChargeStatus({
    from: ownOpenId,
    to: openId
  });
  userInfo.chargingStatus = chargingStatus;

  let followStatus = await getFollowStatus({
    otherOpenId: openId, 
    ownOpenId,
  });
  console.log('followStatus: ', followStatus);
  userInfo.followStatus = followStatus;

  // 兼容
  if(userInfo.tags == undefined || userInfo.tags.length == 0){
    userInfo.tags = ["普通用户"];
  }
  if(userInfo.tagOnShow == undefined || userInfo.tagOnShow == ""){
    userInfo.tagOnShow = userInfo.tags[0];
  }

  return {
    openId: ownOpenId,
    data: userInfo,
    chargingStatus, //充电状态
    followStatus, // 关注状态
    blackStatus, //拉黑状态
  }
}

exports.getOtherInfo = getOtherInfo;