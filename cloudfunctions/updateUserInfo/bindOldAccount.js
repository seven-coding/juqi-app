// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;
const { errorCode } = require('./errorCode');

const {getUserInfo} = require("./userInfo");

const moment = require("moment");

// 更新用户信息
async function bindOldAccount(event, openId) {
 
  let { oldOpenId, newOpenId } = event;

  if (!oldOpenId) {
    return errorCode.LIMIT_QUERY;
  }

  let oldUserInfo = await getUserInfo(oldOpenId);

  let {firstEnterTime} = oldUserInfo;
  // if ()
  console.log(moment(firstEnterTime).valueOf() < moment("2022-10-18").valueOf())
  let isOldAccount = moment(firstEnterTime).valueOf() < moment("2022-10-18").valueOf();

  if (!isOldAccount) {
    // 2022-10月18号之后的账号不可认领
    return errorCode.NEW_ACCOUNT;
  }
  
  
}


exports.bindOldAccount = bindOldAccount;