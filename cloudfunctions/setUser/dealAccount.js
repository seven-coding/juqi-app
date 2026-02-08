// 4: 封禁账号
// 3: 注销账号
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('./errorCode');
const { getUserAdminAuth } = require('./adminAuth');
const { setUserInfo } = require('./utils/userInfo');

async function dealAccount(event) {
  
  const wxContext = cloud.getWXContext();
  // const ownOpenId = wxContext.OPENID;
  const ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let authStatus = await getUserAdminAuth(ownOpenId);
  if (!authStatus) return errorCode.NO_AUTH;


  let { openId,  type } = event;
  let operateOpenId = event.source === 'newApp' ? event.operateOpenId : openId;
  if (!operateOpenId) {
    return errorCode.LIMIT_QUERY
  }

  await setUserInfo({
    openId: operateOpenId,
    setUserInfo: {
      joinStatus: type == 3 ? -1 : -2
    }
  })

  await db.collection('log_admin').add({
    data: {
      openId: operateOpenId,
      operator: ownOpenId,
      joinStatus: type == 3 ? -1 : -2,
      createTime: new Date().getTime(),
      type: 14
    }
  })
  

  return {
    code: 200
  }
  
} 

exports.dealAccount = dealAccount;