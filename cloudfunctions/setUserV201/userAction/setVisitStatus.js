// 4: 封禁账号
// 3: 注销账号
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('../errorCode');
const {
  setRedisExpire
} = require('../utils/redis');

async function setVisitStatus(event) {
  
  const wxContext = cloud.getWXContext();
  // const owner = wxContext.OPENID;
  const owner = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let { openId, visitStatus} = event;
  // 兼容app传递operateOpenId
  openId = event.source === 'newApp' ? event.operateOpenId : openId;

  // 访客记录失效
  await setRedisExpire(`visit_count_${owner}`, 0);

  let isVip = (await db.collection('user').where({
    openId: owner,
    vipStatus: true
  }).get()).data;

  if (isVip && isVip.length) {
    // let noVisiitList = isVip[0].noVisiitList;

    let result;
    if (visitStatus == 0) {
      // 设置留下痕迹
      result = await setVisit(owner, openId);
    } else {

      // 设置不留下痕迹
      result = await setNoVisit(owner, openId);
    }

    return result
  } else {
    return errorCode.NOT_VIP
  }
} 

// 设置不留下访客
async function setNoVisit(owner, openId) {

  let noVisiitList = (await db.collection('user_visit').where({
    openId: owner,
    noVisitId: openId
  }).get()).data.length > 0;

  if (!noVisiitList) {
    await db.collection('user_visit').add({
      data: {
        openId: owner,
        noVisitId: openId,
        createTime: new Date().valueOf(),
      }
    });
  }

  // 已有访问消息删除
  let result = await db.collection('messagesOther').where({
    from: owner,
    to: openId,
    type: 3,
  }).remove()
  console.log(result)
  return {
    code: 200,
    message: "设置痕迹消失成功"
  };
}

// 设置留下访客
async function setVisit(openId, visitId) {
  // 查询是否设置访客名单
  let visitStatus = ((await db.collection('user_visit').where({
    openId: openId,
    noVisitId: visitId
  }).get()).data).length > 0 ;

  if (!visitStatus) {
    return {
      code: 400,
      message: "已设置留下访客记录"
    }
  } else {
    await db.collection('user_visit').where({
      openId: openId,
      noVisitId: visitId
    }).remove();
    return {
      code: 200,
      message: "设置留下痕迹成功"
    }
  }
}

exports.setVisitStatus = setVisitStatus;