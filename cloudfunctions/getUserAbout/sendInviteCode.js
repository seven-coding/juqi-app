// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

const _ = db.command;


async function randomWord(randomFlag, min, max){
  var str = "",
    range = min,
    arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  // 随机产生
  if(randomFlag){
    range = Math.round(Math.random() * (max-min)) + min;
  }
  for(var i=0; i<range; i++){
    pos = Math.round(Math.random() * (arr.length-1));
    str += arr[pos];
  }

  let hasCode = await db.collection('inviteCodes').aggregate()
    .match({
      code: str
    })
    .end();

  if (!hasCode.list.length) {
    return str;
  } else {
    await randomWord(true, 6, 6);
  }
}


// 获取用户权限
async function sendInviteCode(data, openId) {
  try {
    let code = await randomWord(true, 4, 4);

    await db.collection('inviteCodes').add({
      data: {
        openId,
        code: code,
        nums: data.num || 10000
      }
    });
    
    console.log('发码成功', code, data);
    return {
      code: 200,
      data: code
    };
  } catch (error) {
    console.log('发送code失败：', error)
  }
}


exports.sendInviteCode = sendInviteCode;