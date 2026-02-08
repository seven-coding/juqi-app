// 拉黑用户
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

async function userAuth() {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  // let 
  
} 

exports.userAuth = userAuth;