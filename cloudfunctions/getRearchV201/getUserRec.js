// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
  errorCode
} = require('./errorCode')
const _ = db.command;
const $ = db.command.aggregate;


// 获取用户权限
async function getUserRec(keyword, page = 1, limit = 20) {
  try {
    if (!keyword) {
      return errorCode.LIMIT_QUERY
    }

    let query = _.and([_.or([
      {
        nickName: db.RegExp({
          regexp: '.*' + keyword,
          options: 'i',
        })
      },
      {
        labels: db.RegExp({
          regexp: '.*' + keyword,
          options: 'i',
        })
      },
      {
        province: db.RegExp({
          regexp: keyword,
          options: 'i',
        })
      },
    ]),
    {
      joinStatus: _.in([1,2,3,4,5,-1])
    }
    ]);

    let count = await db.collection('user').where(query).count();

    let list = (await db.collection('user').aggregate().match(query).skip((page - 1) * limit)
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
    .limit(limit).
    
    end()).list;

    return {
      code: 200,
      list,
      count: count.total,
    };

  } catch (error) {
    console.log(error);
    return {
      code: 400,
      message: "后端执行报错，请反馈到橘气家长电站"
    }
  }
}



exports.getUserRec = getUserRec;
