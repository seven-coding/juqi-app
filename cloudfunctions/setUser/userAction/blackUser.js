// 拉黑用户
// 先解除双方关注关系
// 再加入拉黑列表
const cloud = require('wx-server-sdk');
const { errorCode } = require('../errorCode');
cloud.init()
const db = cloud.database()
const _ = db.command;
const { setChatId } = require('../setChatId');
const { setFavoriteDynFlag } = require('../utils/setFavoriteDynFlag');
const {
  setRedisExpire
} = require('../utils/redis');

async function blackUser(event) {
  const wxContext = cloud.getWXContext();
  const openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  let { blackId } = event;
  if (!blackId) {
    return errorCode.LIMIT_QUERY
  }

  // 查询是否已经拉黑
  // let blackStatus = await getBlackStatus(openId, blackId);
  // console.log(blackStatus)
  // if (blackStatus) {
  //   // 已经拉黑
  //   return errorCode.ALREADY_BLACK
  // }

  // 私聊关系
  await setChatId(openId, blackId, 0)
  // 收藏动态状态更新
  await setFavoriteDynFlag(openId, blackId, '2')
  // 删除双方关注关系
  await setCancelFollow(openId, blackId);
  // 设置不看她
  await setNoSee(openId, blackId);
  // 设置不看她

  let result = await db.collection('user_black').add({
    data: {
      openId,
      blackId,
      status: 1,
      createTime: db.serverDate()
    }
  })

  if (result.errMsg == 'collection.add:ok') {
    // 删除拉黑缓存
    const redisKey = `${openId}_BLACK_${blackId}`;
    await setRedisExpire(redisKey, 0);

    // 删除拉黑数量缓存
    await setRedisExpire(`${openId}_BLACK_COUNT`, 0);
    

    return errorCode.BLACK_SUCCESS
  } else {
    return errorCode.UPDATE_ERROR
  }
}

exports.blackUser = blackUser;

async function getBlackStatus(openId, blackId) {
  // 获取拉黑信息
  let result = (await cloud.callFunction({
    // 要调用的云函数名称
    name: 'commonRequest',
    // 传递给云函数的event参数
    data: {
      method: "get_black_status",
      A_openId: openId,
      B_openId: blackId
    }
  })).result;

  return result;
}

async function setCancelFollow(openId, blackId) {
  // 删除关注记录
  await db.collection('user_followee').where(_.or([
    {
      openId,
      followeeId: blackId
    },
    {
      openId: blackId,
      followeeId: openId
    },
  ])).remove();
}

async function setNoSee(owner, noSeeId) {

  await setRedisExpire(`${owner}_NO_SEE_LIST`, 0);
  await setRedisExpire(`${owner}_NO_SEE_LIST_V2`, 0);

  let noSeeRecord = (await db.collection('user_no_see').where({
    openId: owner,
    noSeeId: noSeeId,
    type:1
  }).get()).data.length > 0;

  if (!noSeeRecord) {
    let result = await db.collection('user_no_see').add({
      data: {
        openId: owner,
        noSeeId: noSeeId,
        type:1
      }
    });
  
  }

  // let beNoSeeRecord = (await db.collection('user_no_see').where({
  //   openId: noSeeId,
  //   noSeeId: owner,
  //   type: 2
  // }).get()).data.length > 0;

  // if (!beNoSeeRecord) {
  //   let result = await db.collection('user_no_see').add({
  //     data: {
  //       openId: noSeeId,
  //       noSeeId: owner,
  //       type: 2
  //     }
  //   });
  // }

  return;
}




