// 获取用户相关信息
// type: 1 获取用户二维码
// type: 2 获取背包信息
// type: 3 获取橘气币月份明细
// type: 4 获取附近的人
// type: 5 按照分类获取背包信息
const cloud = require('wx-server-sdk')

cloud.init()

// 获取用户个人主页二维码
const { getUserQrcode } = require('./getUserQrcode');
// 获取商店的信息、背包信息
const { getCoinInfo } = require('./getCoinInfo');
// 获取橘气币细节信息
const { getTradeInfo } = require('./getTradeInfo');
// 获取附近的人
const { getNearPeople } = require('./getNearPeople');
// 获取背包信息
const { getShopInfo } = require('./getShopInfo');
const { getUserOtherInfo } = require('./getUserOtherInfo');
// 获取个人主页关系
const { getOperateAction } = require('./getOperateAction');
const { sendInviteCode } = require('./sendInviteCode');

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;
  

  let { type } = event;
  console.log(event)

  if (type == 1) {
    let result = await getUserQrcode(event, openId);
    console.log(result)
    return result;
  } else if (type == 2) {
    let result = await getCoinInfo(event, openId);
    return result;
  } else if (type == 3) {
    let result = await getTradeInfo(event, openId);
    return result;
  } else if (type == 4) {
    let result = await getNearPeople(event, openId);
    return result;
  } else if (type == 5) {
    let result = await getShopInfo(event, openId);
    return result;
  } else if (type == 6) {
    let result = await getUserOtherInfo(event, openId);
    return result;
  } else if (type == 7) {
    let result = await getOperateAction(event, openId);
    return result;
  } else if (type == 8) {
    let result = await sendInviteCode(event, openId);
    return result;
  }

}