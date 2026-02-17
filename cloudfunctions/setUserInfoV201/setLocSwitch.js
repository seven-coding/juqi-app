// type:
//  2:设置附近的人开关
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require("errorCode");
const { updateUserInfo } = require('./utils/userInfo');

// 设置附近的人开关
// 1- 不隐身 2-500米隐身 3-全隐身
async function setLocSwitch(event, openId) {

  let { hiddenStatus } = event;

  if (hiddenStatus == 1) {
    await updateUserInfo(openId, {
      hiddenStatus
    })
  } else if (hiddenStatus == 2) {
    await updateUserInfo(openId, {
      hiddenStatus
    })
  } else if (hiddenStatus == 3) {
    let isVip = (await db.collection('user').where({
      openId,
      vipStatus: true
    }).get()).data;

    if (isVip && isVip.length) {
      await updateUserInfo(openId, {
        hiddenStatus
      })

      return {
        code: 200,
      }
    } else {
      return errorCode.NOT_VIP
    }

  }
  return {
    code: 200
  }

}

exports.setLocSwitch = setLocSwitch;