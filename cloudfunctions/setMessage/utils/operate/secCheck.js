// 安全校验
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

const _ = db.command;

async function secCheck(type, content) {
  try {

    if (type === 'msg') {
      let result = await cloud.openapi.security.msgSecCheck({
        content
      });
     
    } else if (type === 'img') {
      let result = await cloud.openapi.security.imgSecCheck({
        content
      });
    }

    return true
  } catch (error) {
    console.log(content, error)
    return false
  }
}

exports.secCheck = secCheck;
