// type:  number 必填
// 1.获取未读信息
// 2.获取第一屏交互类信息流未读信息
// 3.获取充电信息
// 4.获取评论消息
// 5.获取访客信息
// 6.获取关注提醒
// 7.获取卡片消息
// 8.获取电站消息
// 9.获取点赞评论
// 10.获取微信申请消息
// 11.获取艾特消息
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate
const {
  formatDate
} = require('./formatDate.js')
const {
  getNotReadCount,
  getChargeMessage,
  getCommentMessage,
  getCardsMessage,
  getCirclesMessage,
} = require('operate');
const {
  getCommentLike
} = require('getCommentLike');
const {
  getFollowMessage,
} = require('getFollowMessage');
const {
  getCommonMes
} = require('getCommonMes');

const {
  getMessagesUser
} = require('getMessagesUser');
const {
  getAitMes
} = require('getAitMes');
const {
  getVisitMessage
} = require('getVisitMessage');


const {
  CONFIG
} = require('config');

// 查询互动消息
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
    let openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let {
    page = 1, limit = 20, type, from, groupType, aitType, mock, mockOpenId
  } = event;
  console.log(event)


  if (groupType) {
    // 获取第二屏消息
    let result = await getCommonMes({
      page,
      limit,
      openId,
      groupType
    });
    return result;
  }

  if (type == 1) {
    // 计算第一排未读消息
    let result = await getNotReadCount(openId);
    return result;
  } else if (type == 2) {
    let result = await getMessagesUser({
      openId,
      limit,
      page
    })
    // 计算第一排未读消息
    let notReadCount = await getNotReadCount(openId);
    result.notReadCount = notReadCount;

    return result;
  } else if (type == 3) {
    // 获取电量消息
    let result = await getChargeMessage({
      openId,
      page,
      limit
    });
    return result;
  } else if (type == 4) {
    // 获取评论消息
    let result = await getCommentMessage({
      openId,
      page,
      limit
    });
    return result;
  } else if (type == 5) {
    // 获取访客消息
    let result = await getVisitMessage({
      openId,
      page,
      limit
    });
    return result;
  } else if (type == 6) {
    // 获取关注消息
    let result = await getFollowMessage({
      openId,
      page,
      limit,
      status: _.in([0, 1])
    });
    return result;
  } else if (type == 7) {
    // 获取卡片消息
    let result = await getCardsMessage({
      openId,
      page,
      limit,
      from,
      status: _.in([0, 1])

    });
    return result;
  } else if (type == 8) {
    // 获取电站消息
    let result = await getCirclesMessage({
      from,
      page,
      limit,
      openId,
      status: _.in([0, 1])
    });
    return result;
  } else if (type == 9) {
    // 获取点赞评论消息
    let result = await getCommentLike({
      from,
      page,
      limit,
      openId,
      status: _.in([0, 1])
    });
    return result;
  } else if (type == 10) {
    // 获取微信申请消息
    let result = await getCommonMes({
      from,
      page,
      limit,
      openId,
      status: _.in([0, 1])
    });
    return result;
  } else if (type == 11) {
    // 获取艾特消息
    // type： 11
    // aitType: 1 动态艾特
    // aitType: 2 评论艾特
    let result = await getAitMes({
      from,
      page,
      limit,
      openId,
      aitType
    });

    return result;

  } else {
    let result = await getMessagesUser({
      openId,
      limit,
      page
    })
    // 计算第一排未读消息
    let notReadCount = await getNotReadCount(openId);
    result.notReadCount = notReadCount;

    return result;
  }


}