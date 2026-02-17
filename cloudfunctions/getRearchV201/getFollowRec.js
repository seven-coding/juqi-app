// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

// 搜索我关注
async function getFollowRec(event, page = 1, limit = 20) {
  try {
    let {openId, keyword} = event;

    let userLists = (await db.collection('user_followee').where({
      openId
    }).get()).data;
    console.log(userLists)

    if (!userLists) {
      return {
        code: 200,
        list: []
      }
    }
    userLists = userLists.map(item => {
      return item.followeeId
    });

    let query = {
      // dynStatus: _.in([0 ,1]),
      nickName: db.RegExp({
        regexp: keyword,
        options: 'i',
      }),
      openId: _.in(userLists)
    };

    let count = await db.collection('user').where(query).count();
    let list = (await db.collection('user').aggregate().match(query).skip((page - 1) * limit)
    .limit(limit)
    .addFields({
      userSecret: [{
        juqiCoin: "$juqiCoin",
        juqiBuy: "$juqiBuy",
        juqiReward: "$juqiReward",
        juqiCoinUse: "$juqiCoinUse",
        vipStatus: "$vipStatus",
        vipStartTime: "$vipStartTime",
        vipEndTime: "$vipEndTime",
        vipOperateTime: "$vipOperateTime",
        avatarHat: "$avatarHat",
        avatarStatus: "$avatarStatus",
        avatarHatId: "$avatarHatId",
        volunteerStatus: "$volunteerStatus",
        volunteerNo: "$volunteerNo",
        volunteerTime: "$volunteerTime",
        partnerStatus: "$partnerStatus",
        partnerNo: "$partnerNo",
        partnerTime: "$partnerTime",
        partnerDeclaration: "$partnerDeclaration",
        avaOperateTime: "$avaOperateTime",
        avatarHatTime: "$avatarHatTime",
        dressPlace: "$dressPlace",
      }]
    })
    .end()).list;
    console.log(list)

    return {
      code: 200,
      count: count.total,
      list: list,
    };

  } catch (error) {
    console.log(error);
    return {
      code: 400,
      message: "后端执行报错，请反馈到橘气家长电站"
    }
  }
}

exports.getFollowRec = getFollowRec;