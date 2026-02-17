// 云函数入口文件
const cloud = require('wx-server-sdk')
const {
  getFollowStatus,
  setCancelFollow,
  get_one_follow_status
  // setDelFollow
} = require('follow/index');
const {
  setUserInfo,
  getUserInfo,
  addUserInfo
} = require('userInfo/user');
const {
  getCircle,
} = require('circle/circle');
const {
  getBlackStatus,
  getABBlackStatus
} = require('black/index');

cloud.init()

// 接口相关文档：https://juqi.feishu.cn/wiki/wikcn00oI5xUdB4JUmXq6GofFJb

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  let {
    method
  } = event;

  // 关注相关接口
  if (method == 'get_follow_status') {
    // 获取双方关注关系
    let result = await getFollowStatus(event);
    return result;
  } else if (method == 'set_user_info') {
    // 更新User表
    let result = await setUserInfo(event);
    return result;
  } else if (method == 'get_user_info') {
    // 查询user表
    let result = await getUserInfo(event.openId);
    return result;
  } else if (method == 'add_user_info') {
    // 查询user表
    let result = await addUserInfo(event);
    return result;
  }else if (method == 'get_circle_info') {
    // 查询圈子信息
    let result = await getCircle(event);
    return result;
  }

  // 关注相关接口
  if (method == 'get_one_follow_status') {
    // 获取双方关注关系
    let result = await get_one_follow_status(event);
    return result;
  } else if (method == 'set_cancel_follow') {
    // 获取双方关注关系
    let result = await setCancelFollow(event);
    return result;
  }


  // 拉黑相关
  if (method == 'get_black_status') {
    // 获取A对B的拉黑关系
    let result = await getBlackStatus(event.A_openId, event.B_openId);
    return result;
  } else if (method == 'get_AB_black_status') {
    // 获取A对B的拉黑关系
    let result = await getABBlackStatus(event);
    return result;
  }

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}