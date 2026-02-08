// 4: 封禁账号
// 3: 注销账号
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('../errorCode');
const { getUserAdminAuth, getUserAuth } = require('../adminAuth');
const { setUserInfo } = require('../utils/userInfo');
const { CONFIG } = require('../config');


async function setAccountAuth(event) {
  
  const wxContext = cloud.getWXContext();
  // const ownOpenId = wxContext.OPENID;
  const ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;


  let { openId, joinStatus } = event;

  // 用户状态设置，仅验证小队、风纪委员、超管可设置用户状态
  let userAuth = await getUserAuth(ownOpenId);
  let hasAuth = userAuth && (userAuth.admin || userAuth.superAdmin || userAuth.censor)
  if (!hasAuth) {
    return errorCode.NO_AUTH
  }

  await setUserInfo({
    openId, 
    setUserInfo: {
    joinStatus
  }})

  if (joinStatus == 2) {
    await db.collection('dyn').where({
      openId,
      verifyStatus: _.exists(true)
    }).update({
      data: {
        verifyStatus: 3
      }
    });
  }

  await db.collection('log_admin').add({
    data: {
      openId: openId,
      operator: ownOpenId,
      joinStatus: joinStatus,
      createTime: new Date().getTime(),
      type: CONFIG.LOGS_ADMIN.SET_USER_STATUS
    }
  })

  return {
    code: 200
  }
  
} 

exports.setAccountAuth = setAccountAuth;