const cloud = require('wx-server-sdk');
cloud.init();
const { errorCode } = require('./utils/errorCode');
const { setMesType, getMesType } = require('./utils/messagesType');
const { setMesUser } = require('./utils/messagesUser');

function getDb() {
  return global.__SETMESSAGE_DB__ || (cloud.init(), cloud.database());
}

// 消息状态，status： 1 已读  3 删除
async function setMes(event, openId) {
  const db = getDb();
  const _ = db.command;
  let { mesTypeId, status, mesType, groupType } = event;

  if (!mesTypeId || !status) {
    return errorCode.LIMIT_QUERY;
  }

  let mesInfo = await getMesType(mesTypeId);
  console.log(mesInfo);
  if (openId !== mesInfo.to) {
    return errorCode.NO_AUTH
  }

  let result = await setMesType({
    to: openId,
    _id: mesTypeId
  }, {
    status
  })

  console.log(result);
  if (result.errMsg == "collection.update:ok") {

    if (mesType == 19) {
      // 评论点赞删除
      await setMesUser({
        to: openId,
        type: mesType,
        status: _.in([0, 1])
      }, {
        status
      })
    } else if (mesType == 20 || mesType == 21 || mesType == 22) {
      // 
      await setMesUser(_.or([{
        to: openId,
        groupType: mesInfo.from,
        status: _.in([0, 1])
      }, {
        to: mesInfo.from,
        groupType: openId,
        status: _.in([0, 1])
      }]), {
        status
      })
    } else {
      // 内部消息设置为删除或者已读
      await setMesUser({
        from: mesInfo.from,
        to: openId,
      }, {
        status
      })
    }

    return {
      code: 200,
      message: "操作成功"
    }
  } else {
    return {
      code: 400,
      message: "操作失败"
    }
  }



}

exports.setMes = setMes;