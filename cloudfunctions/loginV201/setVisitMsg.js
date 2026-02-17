const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

async function setVisitMsg(AnyOpenId, ownOpenId) {

  let ifVIP = (await db.collection('user').aggregate()
  .match({
    openId: ownOpenId,
    vipStatus: true
  }).end()).list.length > 0;

  let ifNoVisit = (await db.collection('user_visit').aggregate()
  .match({
    noVisitId: AnyOpenId,
    openId: ownOpenId,
  }).end()).list.length > 0;

  if (ifVIP && ifNoVisit) {
    // 会员不留痕迹
    return;
  }

  let hasVisit = await db.collection('messagesOther').where({
    from: ownOpenId,
    to: AnyOpenId,
    type: 3
  }).get()

  if (hasVisit.data.length) {
    await db.collection('messagesOther').where({
      from: ownOpenId,
      to: AnyOpenId,
      type: 3
    }).update({
      data: {
        createTime: new Date().getTime(), //访问时间
        status: 0,
        visitNums: 1,
        type: 3,
        openId: ownOpenId
      }
    })
  } else {
    await db.collection('messagesOther').add({
      data: {
        from: ownOpenId,
        to: AnyOpenId,
        createTime: new Date().getTime(), //访问时间
        status: 0,
        visitNums: 1,
        type: 3,
        openId: ownOpenId
      }
    })
  }
  
}
exports.setVisitMsg = setVisitMsg;
