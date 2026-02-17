// 支付橘气币
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

const _ = db.command;
const { CONFIG } = require("config");
const { setMessagesUser } = require("messages");

// 获取用户权限
async function sendJuqiCoin(data) {

  let {
    openId,
    outTradeNo, //作为交易标志，避免重复发送
    juqiCoin,
    message,
    tradeName,
    redirecTo,
    SEND_LABEL
  } = data;

  // 橘气币充值
  // 置为已支付状态
  let logInfo = (await db.collection('shopLog').where({ openId, SEND_LABEL }).get()).data;
  if (!logInfo || !logInfo.length) {

    // 充值橘气币
    await db.collection('user').where({ openId }).update({
      data: {
        juqiCoin: _.inc(juqiCoin),
        juqiReward: _.inc(juqiCoin),
      }
    });

    console.log("发放成功")

    // 充值橘气币
    await db.collection('shopLog').add({
      data: {
        outTradeNo,
        type: 5,
        openId,
        createTime: new Date().valueOf(),
        tradeName,
        juqiCoin,
        coinType: CONFIG.SHOP_LOG_COIN_TYPE.JUQI_COIN,
        SEND_LABEL
      }
    });

    
    if (message) {
      await setMessagesUser({
        from: "3dfe72d65fab8647008a91d506bd1290",
        to: openId,
        status: 0,
        type: CONFIG.MESSAGES_USER_TYPE.SYSTEM,
        groupType: CONFIG.GROUP_TYPE.SYSTEM,
        createTime: new Date().valueOf(),
        message,
        fromName: '橘卡丘',
        fromPhoto: "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png",
        secondName: "橘卡丘",
        secondPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png',
        secondMes: message,
        redirecTo: redirecTo,
      })
    }
    
  }
  return {
    code: 200
  }
}

exports.sendJuqiCoin = sendJuqiCoin;
