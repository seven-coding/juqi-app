// 用户注销自己
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { CONFIG } = require('../config');
const { setUserInfo } = require('../utils/userInfo');

async function setUserLogout(event) {
  
  const wxContext = cloud.getWXContext();
  // const ownOpenId = wxContext.OPENID;
  const ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;


  await setUserInfo({
    openId: ownOpenId,
    setUserInfo: {
      joinStatus: -1
    }
  })

  // 用户注销日志
  await db.collection('log_user_action').add({
    data: {
      openId: ownOpenId,
      operator: ownOpenId,
      joinStatus: -1,
      createTime: new Date().getTime(),
      type: CONFIG.LOG_USER_ACTION.LOGOUT,
      logoutReason: event.logoutReason
    }
  })

  return {
    code: 200
  }
  
} 

exports.setUserLogout = setUserLogout;