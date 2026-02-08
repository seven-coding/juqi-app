// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

const {
  getFavoriteCount,
  // getLikeCount,
  getBlackCount
} = require('operate');
const { getRedisValue, setRedisValue, setRedisExpire } = require('./redis')
const { getUserInfo } = require("getUserInfo")

// 不看对方
async function getNoSeeShip(openId, otherOpenId) {
  try {

    let noSeeRecord = (await db.collection('user_no_see').where(_.or({
      openId: openId,
      noSeeId: otherOpenId,
      type: 1
    }, {
      openId: otherOpenId,
      noSeeId: openId,
      type: 2
    })).get()).data;

    if (!noSeeRecord.length) {
      return [0, 0]
    } else {

      let noSeeHer = 0, herNoSee = 0;
      noSeeRecord.map(item => {
        if (item.type == 1) {
          noSeeHer = 1
        } else {
          herNoSee = 1
        }
      });

      reutrn[noSeeHer, herNoSee]

    }

  } catch (error) {
    console.log(error);
  }
}


// 给动态点赞
async function getOperateAction(event, openId) {
  let { AnyOpenId } = event;

  // 查询自己的信息
  let getOperateAction;
  // 统计收藏数
  getOperateAction = await getNoSeeShip(openId);



  return {
    openId,
    data: userInfo
  }
}

exports.getOperateAction = getOperateAction;



