// 消息处理

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
  errorCode
} = require('./utils/errorCode')
const {
  setMesType,
  getMesType
} = require('./utils/messagesType')
const {
  setMesChat,
} = require('./utils/messageChat')
const _ = db.command;

// 消息状态，status： 1 已读  3 删除
async function deleteBothMes(event, openId) {
  let {
    mesTypeId,
    status
  } = event;

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

  if (result.errMsg == "collection.update:ok") {
    if (status == 3) {
      await setMesChat({
        chatId: mesInfo.chatId,
        status: _.in([0, 1]),
      }, {
        readList: _.pull(openId),
      });

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
}


exports.deleteBothMes = deleteBothMes;