//  1 保存地理位置
//  2:设置附近的人隐身
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command;
const { setLocation } = require('./setLocation')
// 附近的人开关设置
const { setLocSwitch } = require('./setLocSwitch')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID;

  let {
    type
  } = event;

  if (type == 1) {
    // 设置地理位置
    let result = await setLocation(event, openId);
    return result;
  } else if (type == 2) {
    // 设置附近的人开关
    let result = await setLocSwitch(event, openId);
    return result;
  }
  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}