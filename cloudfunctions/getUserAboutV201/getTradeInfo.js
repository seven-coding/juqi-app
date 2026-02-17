// 橘气币明细列表
// timestamp当月时间戳
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command;
const moment = require('./moment');

async function getTradeInfo(event, openId) {

  if (!openId) { return; }
  let { timestamp } = event;
  let startTime = moment(timestamp).startOf('month').valueOf() || moment().startOf('month').valueOf();
  let endTime = moment(timestamp).endOf('month').valueOf() || moment().endOf('month').valueOf();

  console.log(startTime, endTime)

  let query =_.and([
      {
        createTime: _.gt(startTime),
        openId,
      },
      {
        createTime: _.lt(endTime),
        openId,
      }
    ]);

  // createTime && (query.createTime = createTime);

  let total = (await db.collection('shopLog').where(query).count()).total;

  let tradeInfo = (await db.collection('shopLog').aggregate()
    .match(query)
    .sort({
      createTime: -1
    })
    .limit(1000)
    .end()).list;

    let spendCoin =  0, getCoin = 0;
    let coinTypeList = [1,5,7,8,9,10]//1 微信支付 5.活动发放 7.收到一个橘子 8.志愿者激励 9.充值未成功补发 10.系统发放
    if (tradeInfo && tradeInfo.length) {
      tradeInfo.map(item => {
        if (item.type == 3) {
          spendCoin += item.juqiCoin
        }
        if (coinTypeList.indexOf(item.type) !=-1) {
          getCoin += item.juqiCoin;
        }
      })
    }


  return {
    code: 200,
    data: tradeInfo,
    total: total,
    spendCoin, //单月支出
    getCoin,
    inviteCount: 0
  }
}


exports.getTradeInfo = getTradeInfo;