// 更新用户信息
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

const { errorCode } = require("errorCode");
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');
const { updateUserInfo } = require('./updateUserInfo');
const { set_vip_config } = require('./set_vip_config');
const { setUserName } = require('./setUserName');
const { bindOldAccount } = require('./bindOldAccount');

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  let openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  console.log(event)

  try {
    let { type } = event;
    let result;

    if (type == 1) {
      // 修改用户名
      result = await setUserName(event, openId);
    } else if (type == "set_vip_config") {
      result = await set_vip_config(event, openId);
    } else if (type == 'bind_old_account') {
      result = await bindOldAccount(event, openId);
    } else {
      result = await updateUserInfo(event, openId);
    } 

    console.log(result)
    return result;

  } catch (error) {
    return {
      code: 400,
      error
    }
  }
}

