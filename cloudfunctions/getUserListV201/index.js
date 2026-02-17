// 获取关注列表
const cloud = require('wx-server-sdk')
const { getFollowersList } = require('./getFollowersList.js')
const { getFollowsList } = require('./getFollowsList.js')
const { getCharging } = require('./getCharging.js')
const { getCircleFollower } = require('./getCircleFollower.js')
const { getBlackList } = require('./getBlackList.js')
const { getNoVisitList } = require('./getNoVisitList.js')
const { getNoSeeList } = require('./getNoSeeList.js')
const { getNoSeeMeList } = require('./getNoSeeMeList.js')

cloud.init()
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const openId = event.openId;
  const type = event.type;
  const circleId = event.circleId;
  const page = event.page || 1;
  const limit = event.limit || 20;
  const wxContext = cloud.getWXContext();
  let ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  if (type === 'follows') {
    // 关注列表
    let result = getFollowsList(event, ownOpenId);
    return result;
  } else if (type === 'followers') {
    // 粉丝列表
    let result = getFollowersList(event, ownOpenId);
    return result;
  } else if (type === 'charging') {
    // 充电列表
    let result = getCharging(event, ownOpenId);
    return result;
  } else if (type === 'circleFollower') {
    // 获取圈子关注
    let result = getCircleFollower(event, ownOpenId);
    return result;

  } else if (type === 'black') {
    // 拉黑列表
    let result = getBlackList(event);
    return result;
  } else if (type === 'noVisit') {
    // 隐身访问
    let result = getNoVisitList(event, ownOpenId);
    return result;
  } else if (type === 'nosee') {
    // 不看她
    let result = getNoSeeList(event, ownOpenId);
    return result;
  } else if (type === 'nobesee') {
    // 不看我
    let result = getNoSeeMeList(event, ownOpenId);
    return result;
  }
}