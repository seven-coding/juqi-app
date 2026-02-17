const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate
const {
  CONFIG
} = require('./config')
async function getShopInfo(event, openId) {
  // 获取橘气币信息
  console.log(event);

  let { goodsId } = event;
  
    // 获取背包信息
    let endTime = new Date().valueOf();
    let backpackInfo = (await db.collection('shopBP').aggregate().match({
      openId,
      status: _.neq(CONFIG.SHOPBP_STATUS.INVALID),
      goodsId
    }).end()).list;

    return {
      code: 200,
      data: backpackInfo
    }
}


exports.getShopInfo = getShopInfo;