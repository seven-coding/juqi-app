// 退出圈子

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
  errorCode
} = require('./errorCode')
const _ = db.command;

// 退出圈子
async function quitCircle(openId, circleId) {
  try {
    // const circleFollow = await db.collection('circle').doc(circleId).update({
    //   data: {
    //     follow: _.pull(openId),
    //     followCircleNums: _.inc(-1)
    //   }
    // });

    const circleFollow = await db.collection('circle_follow').where({
      openId,
      circleId,
    }).remove()
    console.log(circleFollow)
    // 同时删除申请信息
    await db.collection('circle_apply_join').where({
      circleId,
      openId,
      type: 1
    });

    if (circleFollow.errMsg === "collection.remove:ok") {
      return {
        code: 200
      }
    } else {
      return {
        code: 400,
        message: '网络有问题，正在修理中'
      }
    }
  } catch (error) {
    console.log(error)
  }
}

exports.quitCircle = quitCircle;