// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

const moment = require("moment");

// 更新用户信息
async function setUserName(event, openId) {
 
  let { nickName  } = event;

  if (nickName) {
    nickName = nickName.trim();
    if (!nickName.length) {
      return errorCode.No_NICK_NAME;
    }
  }

  // 获取本月是否还可修改
  let start_day_time = moment().startOf('month').valueOf();
  let use_times = (await db.collection('log_user_name').where({
    openId,
    createTime: _.gt(start_day_time)
  }).get()).data.length;

  let isVip = (await db.collection('user').where({
    openId,
    vipStatus: true
  }).get()).data.length > 0;

  let has_auth = false;
  // 会员3次，非会员1次
  if (isVip) {
    has_auth = use_times < 3 ? true : false
  } else {
    has_auth = use_times < 1 ? true : false
  }

  if (!has_auth) {
    if (isVip) {
      return {
        code: 400,
        message: "本月已超过3次修改昵称机会"
      }
    } else {
      return {
        code: 400,
        message: "会员每月有3次修改昵称机会"
      }
    }
  }


  let oldUserInfo = (await db.collection('user').where({
    openId
  }).get()).data[0];
  
  let old_nick_name = oldUserInfo.nickName;


  // 如果包括头像地址，同时更新图片地址的缓存地址

  let updateResult = await db.collection('user').where({
    openId
  })
    .update({
      data: {
        nickName
      },
    });

  await setRedisExpire(openId, 0);

  if (updateResult.errMsg === 'collection.update:ok') {
    await db.collection('log_user_name').add({
      data: {
        openId: openId,
        old_nick_name,
        nickName,
        createTime: new Date().getTime(),
      }
    })

    return { code: 200 }
  } else {
    return { code: 400 }
  }
  
}


exports.setUserName = setUserName;