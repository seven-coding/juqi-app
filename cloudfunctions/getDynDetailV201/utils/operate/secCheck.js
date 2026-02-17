// 不在此处 cloud.init()，由 index.js 按 event.envId 初始化，避免查错库 404
const cloud = require('wx-server-sdk');

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
