// 认领老账号
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('../errorCode');
const { getUserInfo, setUserInfo } = require('../utils/userInfo');
const {
  setRedisExpire
} = require('../utils/redis');

async function setCancelAccount(event) {
  const wxContext = cloud.getWXContext();
  // const ownOpenId = wxContext.OPENID;
  const ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;


  let myUserInfo = await getUserInfo(ownOpenId);
  console.log(myUserInfo);

  // 老账号Id
  let { oldAccountId } = event;
  let oldUserInfo = await getUserInfo(oldAccountId);
  console.log(oldUserInfo);

  if (!oldUserInfo.bindOpenId) {
    return errorCode.HAS_NO_BIND;
  }

  let isAdmin = myUserInfo.auth.admin || myUserInfo.auth.superAdmin;
  if (!isAdmin && (!myUserInfo.bindOpenId || myUserInfo.bindOpenId != oldAccountId)) {
    return errorCode.YOU_HAS_NO_BIND;
  }

  // 删除绑定信息
  await db.collection('user').where({
    openId: oldAccountId,
  }).update({
    data: {
      bindOpenId: _.remove(),
      bindType: _.remove(),
    }
  });

  // 删除绑定信息
  await db.collection('user').where({
    openId: isAdmin ? oldUserInfo.bindOpenId : oldAccountId,
  }).update({
    data: {
      bindOpenId: _.remove(),
      bindType: _.remove(),
    }
  });
 
  

  await setRedisExpire(oldAccountId, 0);
  await setRedisExpire(isAdmin ? oldUserInfo.bindOpenId : ownOpenId, 0);

  let addLogResult = await db.collection('log_user_bind').add({
    data: {
      old_account: oldAccountId,
      new_account: isAdmin ? oldUserInfo.bindOpenId : ownOpenId,
      createTime: new Date().valueOf(),
      type: 2,
      adminOpenId: isAdmin ? ownOpenId : "",
    }
  });

  return {
    code: 200,
    message: "取消绑定成功"
  }

}



exports.setCancelAccount = setCancelAccount;

