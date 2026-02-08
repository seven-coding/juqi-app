// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
  errorCode
} = require('./errorCode')
const _ = db.command;

async function contentAuth(type, content) {
  if (type === 'msg') {
    let result = await cloud.openapi.security.msgSecCheck({
      content
    });

     if (result.errCode !== 0) {
       console.log(result, result)
      return false;
     }
  } else if (type === 'img') {
    let result = await cloud.openapi.security.imgSecCheck({
      content
    });
  }
}

exports.contentAuth = contentAuth;
