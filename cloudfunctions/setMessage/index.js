// 云函数入口文件
const cloud = require('wx-server-sdk')
const { setMes } = require('./setMes')
// 删除聊天记录，双向消息
const { deleteBothMes } = require('./deleteBothMes')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  let {
    type,
    mesType
  } = event;

  console.log(event)
  //  删除单向消息
  if (type == 1 && mesType == 23) {
    // 删除个人聊天消息
    let result = await deleteBothMes(event, openId);
    return result;
  } else if (type == 1) {
    let result = await setMes(event, openId);
    return result;
  }



  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}