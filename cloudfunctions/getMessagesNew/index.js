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

// 默认当前环境；main 内可根据 event.dataEnv 切换为 prod/test
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate

// 生产/测试环境 ID（与 appApi/utils/env.js 一致，用于 dataEnv 切换）
const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';
const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';
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
  // 支持 dataEnv：App 测试环境调用时可传 dataEnv='prod' 读线上消息数据
  const dataEnv = event.dataEnv || 'test';
  const envId = dataEnv === 'prod' ? PROD_ENV_ID : TEST_ENV_ID;
  cloud.init({ env: envId });
  global.__GETMESSAGESNEW_DB__ = cloud.database();
  const _ = global.__GETMESSAGESNEW_DB__.command;
  const maskId = (id) => (id && id.length > 4 ? '****' + id.slice(-4) : (id === '' ? '(空串)' : 'nil'));

  // 传参日志：入口 event 与 ID 来源（appApi 调用会传 event.openId，不传 source，需优先用 event.openId）
  console.log('[getMessagesNew] 入口 event 键:', Object.keys(event).join(', '));
  console.log('[getMessagesNew] 传参 dataEnv=', dataEnv, ', envId=', envId);

  const wxContext = cloud.getWXContext();
  const openIdFromEvent = event.openId;
  const openIdFromWx = wxContext.OPENID;
  // appApi 调用时只传 openId 不传 source，优先使用 event.openId，否则用微信上下文
  let openId = (openIdFromEvent != null && openIdFromEvent !== '') ? openIdFromEvent : (event.source === 'newApp' ? openIdFromEvent : openIdFromWx);

  console.log('[getMessagesNew] 传参 openId=', maskId(openId), ', 来源=', (openIdFromEvent != null && openIdFromEvent !== '') ? 'event.openId' : (event.source === 'newApp' ? 'event.source=newApp' : 'wxContext.OPENID'), ', openId类型=', typeof openId, ', 长度=', (openId && openId.length) || 0, ', wxContext.OPENID=', maskId(openIdFromWx));

  let {
    page = 1, limit = 20, type, from, groupType, aitType, mock, mockOpenId, skipNotReadCount
  } = event;

  console.log('[getMessagesNew] 传参 type=', type !== undefined ? type : 'nil(首屏)', ', page=', page, ', limit=', limit, ', skipNotReadCount=', !!skipNotReadCount);


  if (groupType) {
    // 获取第二屏消息
    let result = await getCommonMes({
      page,
      limit,
      openId,
      groupType
    });
    console.log('[getMessagesNew] groupType=', groupType, ' messages.length=', (result.messages || []).length, ', count=', result.count);
    return result;
  }

  if (type == 1) {
    // 计算第一排未读消息
    let result = await getNotReadCount(openId);
    console.log('[getMessagesNew] type=1 未读统计 返回');
    return result;
  } else if (type == 2) {
    let result = await getMessagesUser({
      openId,
      limit,
      page
    });
    if (!skipNotReadCount) {
      let notReadCount = await getNotReadCount(openId);
      result.notReadCount = notReadCount;
    }
    console.log('[getMessagesNew] type=2 首屏 messages.length=', (result.messages || []).length, ', count=', result.count);
    return result;
  } else if (type == 3) {
    // 获取电量消息
    let result = await getChargeMessage({
      openId,
      page,
      limit
    });
    console.log('[getMessagesNew] type=3 充电 messages.length=', (result.messages || []).length, ', count=', result.count);
    return result;
  } else if (type == 4) {
    // 获取评论消息
    let result = await getCommentMessage({
      openId,
      page,
      limit
    });
    console.log('[getMessagesNew] type=4 评论 messages.length=', (result.messages || []).length, ', count=', result.count);
    return result;
  } else if (type == 5) {
    // 获取访客消息
    let result = await getVisitMessage({
      openId,
      page,
      limit
    });
    console.log('[getMessagesNew] type=5 访客 messages.length=', (result.messages || []).length, ', count=', result.count);
    return result;
  } else if (type == 6) {
    // 获取关注消息
    let result = await getFollowMessage({
      openId,
      page,
      limit,
      status: _.in([0, 1])
    });
    console.log('[getMessagesNew] type=6 关注 messages.length=', (result.messages || []).length, ', count=', result.count);
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
    console.log('[getMessagesNew] type=7 卡片 messages.length=', (result.messages || []).length, ', count=', result.count);
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
    console.log('[getMessagesNew] type=8 电站 messages.length=', (result.messages || []).length, ', count=', result.count);
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
    console.log('[getMessagesNew] type=9 点赞评论 messages.length=', (result.messages || []).length, ', count=', result.count);
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
    console.log('[getMessagesNew] type=10 微信申请 messages.length=', (result.messages || []).length, ', count=', result.count);
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
    console.log('[getMessagesNew] type=11 艾特 messages.length=', (result.messages || []).length, ', count=', result.count);
    return result;

  } else {
    let result = await getMessagesUser({
      openId,
      limit,
      page
    });
    if (!skipNotReadCount) {
      let notReadCount = await getNotReadCount(openId);
      result.notReadCount = notReadCount;
    }
    console.log('[getMessagesNew] type=nil 默认首屏 messages.length=', (result.messages || []).length, ', count=', result.count);
    return result;
  }


}