// 语音验证帖子，超过3条进行验证通过
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const request = require('request-promise');
                                                                      ///用户信息同步uniapp
async function verifyRegister(openId) {
  let userInfo = (await db.collection('user').where({ openId }).get()).data;
  let {
    city,
    inviteUser,
    joinSort,
    locTime,
    unionId,
    nickName,
  } = userInfo

  const url = 'https://fc-mp-6bc74288-75a2-48d4-b67e-23bc1a9ee9ad.next.bspapp.com/wx-openapi';

  let cityResult = await request({
    // dataType:'jsonp',
    method: 'post',
    uri: url,
    body: {
      data: {
        city,
        inviteUser,
        joinSort,
        locTime,
        unionId,
        nickName,
        openId,
      },
      module: 'user',
      operation: 'register'
    },
    json: true
  }).then((body) => {
    return body
  }).catch(err => {
    return err;
  })

  console.log(cityResult);
  return {
    code: 200
  }
}

exports.verifyRegister = verifyRegister;