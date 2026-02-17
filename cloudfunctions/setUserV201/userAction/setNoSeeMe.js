// 她不看我的的动态
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('../errorCode');
const {
  setRedisExpire
} = require('../utils/redis');

async function setNoSeeMe(event) {

  const wxContext = cloud.getWXContext();
  // const owner = wxContext.OPENID;
  const owner = event.source === 'newApp' ? event.openId : wxContext.OPENID;


  let { noSeeId, noSeeType } = event;

  // 访客记录失效
  // await setRedisExpire(`visit_count_${owner}`, 0);

  let isVip = (await db.collection('user').where({
    openId: owner,
    vipStatus: true
  }).get()).data.length > 0;

  if (!isVip) {
    return errorCode.NOT_VIP
  }

  await setRedisExpire(`${noSeeId}_NO_SEE_LIST`, 0)

  if (noSeeType == "add") {
    // 增加
    let noSeeRecord = (await db.collection('user_no_see').where({
      openId: noSeeId,
      noSeeId: owner,
      type: 2
    }).get()).data.length > 0;
  
    if (noSeeRecord) {
      return errorCode.HAS_RECORD
    }
  
    let result = await db.collection('user_no_see').add({
      data: {
        openId: noSeeId,
        noSeeId: owner,
        type: 2
      }
    });
  
    console.log(result)
    return {
      code: 200,
      message: "设置成功"
    }
  } else {
    // 移除
    let result = await db.collection('user_no_see').where({
      openId: noSeeId,
      noSeeId: owner,
      type: 2
    }).remove();

    console.log(result)

    return {
      code: 200,
      message: "移除成功"
    }
  }



  let noSeeRecord = (await db.collection('user_no_see').where({
    openId: owner,
    noSeeId: noSeeId,
    type: 2
  }).get()).data.length > 0;

  if (noSeeRecord) {
    return errorCode.HAS_RECORD
  }

  let result = await db.collection('user_no_see').add({
    data: {
      openId: owner,
      noSeeId: noSeeId,
      type: 2
    }
  });

  console.log(result)
  return {
    code: 200,
    message: "设置成功"
  }

}

exports.setNoSeeMe = setNoSeeMe;