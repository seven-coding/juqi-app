// 退出圈子

const cloud = require('wx-server-sdk')
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV})
const db = cloud.database()
const {
  errorCode
} = require('./errorCode')
const _ = db.command;

// 退出圈子
async function joinCircle(event, openId) {
  try {
    let {
      circleId,
      applyImages,
      applyReason,
    } = event;

    // 获取圈子信息,判断电站帖子是否需要权限审核,
    let auth = (await cloud.callFunction({
      name: 'commonRequestV201',
      // 传递给云函数的event参数
      data: {
        method: "get_circle_info",
        circleId
      }
    })).result.isJoinCheck;

    if (auth) {
      // 需要审核
      if (!applyReason) {
        return errorCode.NO_REASON
      }

      let result = await db.collection('circle_apply_join').add({
        data: {
          circleId,
          openId,
          createTime: new Date().valueOf(), //申请时间
          applyImages,
          applyReason,
          applyStatus: 0,
          type: 1
        }
      });

      console.log(result);
      if (result.errMsg == "collection.add:ok") {
        // 申请中
        await db.collection('circle_follow').add({
          data: {
            openId,
            circleId,
            status: 1,
            create_time: db.serverDate(),
          }
        })

        return {
          code: 200
        }
      } else {
        return {
          code: 400,
          message: result
        }
      }

    } else {
      // 直接发送
      const circleFollow = await db.collection('circle_follow').add({
        data: {
          openId,
          circleId,
          status: 2,
          create_time: db.serverDate()
        }
      })

      if (circleFollow.errMsg === 'collection.add:ok') {
        return {
          code: 200
        }
      } else {
        return {
          code: 400,
          message: '网络有问题，正在修理中'
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
}

exports.joinCircle = joinCircle;