// 加入or退出圈子
// 1.加入圈子函数
// 2.退出圈子
// 若设置了审核权限的圈子，需要申请加入
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command;

const {
  errorCode
} = require('./errorCode')
const {
  quitCircle
} = require('./quitCircle')
const {
  joinCircle
} = require('./joinCircle')
const {
  setRedisExpire
} = require('./redis')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  let openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let {
    circleId,
    applyImages,
    applyReason,
    type
  } = event;

  if (!circleId) {
    return errroCode.LIMIT_QUERY;
  }

  try {
    // 已加入电站缓存失效
    let REDIS_KEY = `${openId}_join_circle_list`;
    await setRedisExpire(REDIS_KEY, 0);

    
    if (type && type == 2) {
      // 退出电站
      let result = await quitCircle(openId, circleId);
      return result;

    } else {
      let result = await joinCircle(event, openId);
      return result;
    }
  } catch (error) {
    console.log(error);
    return {
      code: 400,
      error
    }
  }
}