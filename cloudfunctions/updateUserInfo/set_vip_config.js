// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

const { errorCode } = require('./errorCode');

// 更新用户信息
async function set_vip_config(event, openId) {

  let {
    showVisit, ////来访消息打开
    showFollow, //显示关注列表
    showFollower, //显示粉丝列表
    showCharge, //显示充电列表 
    restStatus, //闭门休息状态 
    cancelFollow, //取消关注提醒
  } = event;
  
  console.log("执行")
  let isVip = ((await db.collection('user').where({
    openId,
    vipStatus: true
  }).get()).data).length > 0;

  if (!isVip) {
    return errorCode.NO_VIP
  }
  console.log("vip")

  let newVipConfig = {
    showVisit,
    showFollow,
    showFollower,
    showCharge,
    restStatus,
    cancelFollow
  }

  console.log(openId, )
  let result = await db.collection('user').where({ openId }).update({
    data: {
      vipConfig: newVipConfig
      // ['vipConfig.showVisit']: showVisit,
      // ['vipConfig.showFollow']: showFollow,
      // ['vipConfig.showFollower']: showFollower,
      // ['vipConfig.showCharge']: showCharge,
      // ['vipConfig.restStatus']: restStatus,
    }
  });

  console.log(result)
  await setRedisExpire(openId, 0);

  return {
    code: 200,
    message: "修改成功"
  }

}


exports.set_vip_config = set_vip_config;