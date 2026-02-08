// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

const _ = db.command;
const { CONFIG } = require('./config')
const { setMessagesUser } = require("./utils/messages");

// 发奖
async function award(event) {
  const wxContext = cloud.getWXContext()
  // const operator = wxContext.OPENID
  const operator = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let {
    openId,
    juqiCoin,
    juqiType,//发放橘气币type 5.活动发放 8.志愿者激励 9.充值未成功补发 10.系统发放
    awardReason//发放橘气币原因
  } = event;
  let operateOpenId = event.source === 'newApp' ? event.operateOpenId : openId;
  console.log(`给${operateOpenId}开始发送奖励：${juqiCoin}`);

  // 充值橘气币
  await db.collection('user').where({ openId: operateOpenId }).update({
    data: {
      juqiCoin: _.inc(parseInt(juqiCoin)),
      juqiReward: _.inc(parseInt(juqiCoin)),
    }
  });

  // 充值橘气币
  await db.collection('shopLog').add({
    data: {
      outTradeNo: awardReason,
      type: juqiType,
      openId: operateOpenId,
      createTime: new Date().valueOf(),
      tradeName: awardReason + ' x ' + juqiCoin,
      juqiCoin: parseInt(juqiCoin),
      coinType: CONFIG.SHOP_LOG_COIN_TYPE.JUQI_COIN
    }
  });

  let result = await db.collection('log_admin').add({
    data: {
      openId: operateOpenId,
      operator: operator,
      createTime: new Date().getTime(),
      type: CONFIG.LOGS_ADMIN.AWARD,
      tradeName: awardReason + ' x ' + juqiCoin,
      juqiCoin: parseInt(juqiCoin),
      coinType: CONFIG.SHOP_LOG_COIN_TYPE.JUQI_COIN,
      outTradeNo: awardReason,
    }
  });

  console.log(result)

  await setMessagesUser({
    from: "3dfe72d65fab8647008a91d506bd1290",
    to: operateOpenId,
    status: 0,
    type: CONFIG.MESSAGES_USER_TYPE.SYSTEM,
    groupType: CONFIG.GROUP_TYPE.SYSTEM,
    createTime: new Date().valueOf(),
    message: juqiCoin + "个橘气币已放入你的背包，请在我的-背包中查看",
    fromName: '橘卡丘',
    fromPhoto: "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png",
    secondName: "橘卡丘",
    secondPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png',
    secondMes: juqiCoin + "个橘气币已放入你的背包，请在我的-背包中查看"
  })
  return {
    code: 200
  }
}

exports.award = award;

