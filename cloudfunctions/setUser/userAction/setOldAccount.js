// 认领老账号
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { errorCode } = require('../errorCode');
const { getUserInfo, setUserInfo } = require('../utils/userInfo');
const {
  setRedisExpire
} = require('../utils/redis');

async function setOldAccount(event) {
  const wxContext = cloud.getWXContext();
  // const ownOpenId = wxContext.OPENID;
  const ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;


  let myUserInfo = await getUserInfo(ownOpenId);
  console.log(myUserInfo);

  // 老账号Id
  let { oldAccountId } = event;
  let oldUserInfo = await getUserInfo(oldAccountId);
  console.log(oldUserInfo);

  if (oldUserInfo.bindOpenId) {
    return errorCode.HAS_BIND;
  }

  if (myUserInfo.bindOpenId) {
    return errorCode.YOU_HAS_BIND;
  }

  if (!(myUserInfo.juqiCoin > 1)) {
    return errorCode.NO_JUQI_COIN;
  }
 

  // 花费1个橘气币
  let payResult = await useJuqiCoin({
    openId: ownOpenId,
    totalFee: 1,
    tradeName: "旧账号绑定"
  });

  if (payResult) {
    // 绑定自己的旧账号信息
    await setUserInfo({
      openId: ownOpenId,
      setUserInfo: {
        bindOpenId: oldAccountId,
        bindType: "new_account"
      }
    })

    // // 绑定自己的新账账号信息
    await setUserInfo({
      openId: oldAccountId,
      setUserInfo: {
        bindOpenId: ownOpenId,
        bindType: "old_account"
      }
    })

    let addLogResult = await db.collection('log_user_bind').add({
      data: {
        old_account: oldAccountId,
        new_account: ownOpenId,
        createTime: new Date().valueOf(),
        type: 1
      }
    });

    await setRedisExpire(oldAccountId, 0);
    await setRedisExpire(ownOpenId, 0);

    return {
      code: 200,
      message: "绑定成功"
    }
  } else {
    return {
      code: 400,
      message: "橘气币支付失败"
    }
  }

}



exports.setOldAccount = setOldAccount;

async function useJuqiCoin(useData) {

  let { openId, totalFee, tradeName } = useData;

  // 计算消费coin
  // 消费coin
  await db.collection('user').where({ openId }).update({
    data: {
      juqiCoin: _.inc(totalFee * -1),
      juqiCoinUse: _.inc(totalFee)
    }
  });
  console.log(`消费：${totalFee} ， 购买：老账号绑定, 价格：${totalFee}`)

  let createTime = new Date().valueOf();
  // 添加购买记录
  let res = await db.collection('shopLog').add({
    data: {
      goodsType: 4,
      goodsName: tradeName,
      createTime: new Date().valueOf(),
      type: 11,
      openId,
      tradeName: tradeName,
      totalFee: totalFee * -1,
      juqiCoin: totalFee,
      coinType: 2,
      count: 1,
      goodsDesc: tradeName,
    }
  });

  console.log(res)
  return true;
}