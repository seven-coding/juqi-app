const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command;

async function getUserQrcode(event, openId) {

  let userInfo = (await db.collection('user').where({ openId }).get()).data[0];
  let {wxQrcodeImage} = userInfo;
  if (wxQrcodeImage) {
    return {
      code: 200,
      data: wxQrcodeImage
    }
  }


  // 生成个人主页
  const result = await cloud.openapi.wxacode.getUnlimited({
    // scene: '',
    // scene: "openId=' +openId",
    page: "pages/juqi/user/index",
    scene: 'o=' + openId //因为给接口不能超过32个字符长度，openId占用28个字符长度
  })

  // console.log(result)

  let url = await uploadFile(result.buffer, openId);

  await setUserInfo(openId, url)

  return {
    code: 200,
    data: url
  }
}

// 个人主页二维码图片上传
async function uploadFile(buffer, openId) {

  // 将buffer文件上传到云存储
  let res = await cloud.uploadFile({
    cloudPath: 'personQrcode/' + openId + '.jpg', //这里如果可以重复就用openId，如果不可能重复就用 
    fileContent: buffer, //处理buffer 二进制数据
    success: res => {
      // 文件地址
      console.log(res.fileID);
      resolve(res.fileID)
    },
    fail: err => {
      console.log(err)
      resolve(false);
    }
  })

  console.log(res.fileID)
  return res.fileID
}

// 个人主页二维码图片设置到个人信息
async function setUserInfo(openId, wxQrcodeImage) {
  let updateResult = await db.collection('user').where({
    openId
  }).update({
    data: {
      wxQrcodeImage
    }
  });
  console.log(updateResult)
}


exports.getUserQrcode = getUserQrcode;