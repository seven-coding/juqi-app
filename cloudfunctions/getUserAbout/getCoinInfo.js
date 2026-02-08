const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate
const {
  CONFIG
} = require('./config')
async function getCoinInfo(event, openId) {
  // 获取橘气币信息
  console.log(event);

  let { goodsType } = event;
  if (goodsType && goodsType !== 1) {
    let backpackInfo = (await db.collection('shopBP').aggregate().match({
      openId,
      status: _.neq(CONFIG.SHOPBP_STATUS.INVALID),
      goodsType: 2,
      count: _.gt(0)
    }).end()).list;

    return {
      code: 200,
      data: {
        backpackInfo
      }
    }
  } else {
    // 查询首屏
    let userInfo = (await db.collection('user').where({ openId }).get()).data;
    let juqiCoin = 0,
    juqiBuy = 0,
    juqiReward = 0,
    juqiCoinUse = 0;

    if (userInfo && userInfo.length) {
      juqiCoin = userInfo[0].juqiCoin || juqiCoin;
      juqiBuy = userInfo[0].juqiBuy || juqiBuy;
      juqiReward = userInfo[0].juqiReward || juqiReward;
      juqiCoinUse = userInfo[0].juqiCoinUse || juqiCoinUse;
    }

    // 获取背包信息
    let endTime = new Date().valueOf();
    let backpackInfo = (await db.collection('shopBP').aggregate().match({
      openId,
      status: _.neq(CONFIG.SHOPBP_STATUS.INVALID),
      BPLeftTime: _.gt(0),
      goodsType
    }).end()).list;

    return {
      code: 200,
      data: {
        juqiBuy,
        juqiReward,
        juqiCoinUse,
        juqiCoin,
        backpackInfo
      }
    }
  } 
}


exports.getCoinInfo = getCoinInfo;