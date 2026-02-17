// 12: 管理员封禁账号
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('../errorCode');
const { CONFIG } = require('../config');
const { getUserAdminAuth } = require('../adminAuth');
const { setUserInfo } = require('../utils/userInfo');

async function setUserBlack(event) {

  const wxContext = cloud.getWXContext();
  // const ownOpenId = wxContext.OPENID;
  const ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;


  let auth = await getUserAdminAuth(ownOpenId);
  if (!auth.superAdmin && !auth.admin && !auth.censor) return errorCode.NO_AUTH;

  // blackStatus -2 表示永久封禁，-3临时封禁
  let { openId, blackTime, blackList, blackOther, blackReason, blackStatus } = event;
  // 兼容app
  let operateOpenId = event.source === 'newApp' ? event.operateOpenId : openId;
  if (!operateOpenId || !blackReason || !blackStatus) {
    return errorCode.LIMIT_QUERY
  }

  let blackType = blackTime != -1 ? 2 : 1; //2表示临时封禁
  let blackStartTime = new Date().getTime();

  if (blackTime == -1) {
    // 永久封禁
    let result = await db.collection('log_admin').add({
      data: {
        openId: operateOpenId,
        operator: ownOpenId,
        joinStatus: -2,
        createTime: new Date().getTime(),
        type: CONFIG.LOGS_ADMIN.SET_USER_BLACK,
        blackTime, // -1表示永久封禁
        blackList,
        blackOther,
        blackReason,
        blackType
      }
    });

    console.log(result)

    await setUserInfo({
      openId: operateOpenId,
      setUserInfo: {
        joinStatus: -2,
        blackReason,
        blackOther,
        blackTime,
        blackList,
        blackEndTime: _.remove(),
        blackStartTime,
        blackTime: _.remove(),
        blackId: result._id,
        blackType,
        blackOperator: ownOpenId
      }
    })

    return {
      code: 200
    }

  } else {
    // 封禁天数
    let blackEndTime = blackStartTime + Number(blackTime) * 1000 * 60 * 60 * 24;

    let result = await db.collection('log_admin').add({
      data: {
        openId: openId,
        operator: ownOpenId,
        joinStatus: -2,
        createTime: new Date().getTime(),
        type: CONFIG.LOGS_ADMIN.SET_USER_BLACK,
        blackTime,
        blackList,
        blackOther,
        blackReason,
        blackEndTime,
        blackType
      }
    });

    console.log(result)

    await setUserInfo({
      openId: operateOpenId,
      setUserInfo:
      {
        joinStatus: -2,
        blackReason,
        blackOther,
        blackTime,
        blackStartTime,
        blackList,
        blackEndTime,
        blackId: result._id,
        blackType,
        blackOperator: ownOpenId
      }
    })


    return {
      code: 200
    }
  }


}

exports.setUserBlack = setUserBlack;