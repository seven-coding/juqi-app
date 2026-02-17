// 电她
const cloud = require('wx-server-sdk');
const { errorCode } = require('./errorCode');

cloud.init()
const db = cloud.database()
const _ = db.command;
const messageType = 1;
const chargeType = 2;
const { setUserInfo } = require('./userInfo');

// 云函数入口函数
exports.main = async (event, context) => {
  console.log(event);
  const { source, chargeOpenId, openId } = event;
  // charge id: targetOpenId=被充电的人, actionOpenId=充电的人（App 传 chargeOpenId + openId，不传 source）
  let targetOpenId;
  let actionOpenId;
  if (chargeOpenId != null && openId != null) {
    targetOpenId = chargeOpenId;
    actionOpenId = openId;
  } else if (source) {
    targetOpenId = chargeOpenId;
    actionOpenId = openId;
  } else {
    const wxContext = cloud.getWXContext();
    actionOpenId = wxContext.OPENID;
    targetOpenId = openId;
  }
  

  // 不能自己电自己哦
  if (targetOpenId === actionOpenId) {
    return errorCode.CANNOT_CHARGE_SELF;
  }

  // 判断可电人状态
  let statusResult = await db.collection('messagesOther').where({
    to: targetOpenId,
    from: actionOpenId,
    createTime: _.gte(new Date(new Date().toLocaleDateString()).getTime()),
    type: messageType,
    chargeType: chargeType
  }).get();

  if (statusResult.data && statusResult.data.length) {
    return errorCode.HAS_CHARGE;
  }

  // 累计电人状态
  let newStatusResult = await db.collection('messagesOther').where({
    to: targetOpenId,
    from: actionOpenId,
    type: messageType,
    chargeType: chargeType
  }).get();

  if (newStatusResult.data && newStatusResult.data.length) {
    await db.collection('messagesOther').where({
      from: actionOpenId,
      to: targetOpenId,
      type: messageType,
      chargeType: chargeType
    }).update({
      data: {
        createTime: new Date().getTime(),
        status: 0,
        chargeNums: _.inc(1)
      }
    })
  } else {
    await db.collection('messagesOther').add({
      data: {
        to: targetOpenId,
        from: actionOpenId,
        createTime: new Date().getTime(), //发布时间
        status: 0,
        chargeNums: 1,
        type: messageType,
        chargeType: chargeType
      }
    });
  }

  const chargResult = await setUserInfo(targetOpenId, {
    chargeNums: _.inc(1),
  })
  console.log({
    chargResult,
    code: 200
  })

  return {
    chargResult,
    code: 200
  }

}