// 查询用户信息
// 这里存在两种状态：1.查询自己的个人信息 2.查询别人的个人信息
const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init()

const { getOwnInfo } = require('./getOwnInfo');
const { getOtherInfo } = require('./getOtherInfo');
const { getVipInfo } = require('./getVipInfo');

// chargingStatus: 可电人状态
// publishCount: 发布数量
// followerNums: 粉丝数
// followNums: 关注数
// followType: 关注状态
exports.main = async (event, context) => {
  console.log(event);
  let {source, unionId} = event;
  let ownOpenId, openId;

  if (source && source== 'newApp') {
    // app登陆逻辑，使用unionId
    ownOpenId = event.openId || event.ownOpenId;
    unionId = event.unionId
    openId = event.openId || ownOpenId;
  } else if(!ownOpenId){
    const wxContext = cloud.getWXContext()
    ownOpenId = wxContext.OPENID;
    unionId = wxContext.UNIONID;
    openId = event.openId || ownOpenId;
  }
  console.log('unionId', unionId)

  let isOwn = ownOpenId == openId; //是否本人
  let {action, type } = event;

  if (!unionId && !openId) {
    return false;
  }

  if (type == 'get_vip_info') {
    // 查看会员配置
    let result = await getVipInfo(ownOpenId);
    return result;
  } else if (isOwn) {
    // 查看自己用户信息
    let result = await getOwnInfo(ownOpenId, unionId, source);
    return result;
  } else {
    // 查询别人的用户信息
    let result = await getOtherInfo(ownOpenId, openId, action);
    return result;
  } 
}