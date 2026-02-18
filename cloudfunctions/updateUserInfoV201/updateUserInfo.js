// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;
const request = require('request-promise');

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');
const { errorCode } = require('./errorCode');

async function getTempList(imageIds) {
  let res = await new Promise((resolve, reject) => {
    cloud.getTempFileURL({
      fileList: imageIds
    }).then(res => {
      // get temp file URL
      console.log(res.fileList)
      if (res.fileList) {
        let newImages = res.fileList.map(item => {
          return item.tempFileURL + "?imageMogr2/auto-orient/heic-exif/1/format/jpeg/thumbnail/120x120%3E"
        })

        resolve(newImages);
      }

    }).catch(error => {
      // handle error
      console.log(error)
      resolve(false);
    })
  });

  return res;
}

// 更新用户信息
async function updateUserInfo(event, openId) {

  console.log(event);
  if (Object.keys(event).length === 0) {
    return {
      code: 10001
    }
  }

  let {
    avatarUrl,
    nickName,
    labels,
    type,
    mobile
  } = event;

  if (nickName) {
    nickName = nickName.trim();
    if (!nickName.length) {
      return errorCode.No_NICK_NAME;
    }
  }

  if (labels) {
    labels = labels.trim();
    if (!labels.length) {
      return errorCode.NO_LABEL;
    }
  }

  let oldUserInfo = (await db.collection('user').where({
    openId
  }).get()).data[0];

  let avatarVisitUrl;
  const avatarUrlStr = typeof avatarUrl === 'string' ? avatarUrl : (avatarUrl && avatarUrl[0]);
  const avatarUrlList = typeof avatarUrl === 'string' ? [avatarUrl] : (Array.isArray(avatarUrl) ? avatarUrl : []);
  if (avatarUrlStr && avatarUrlStr.includes && avatarUrlStr.includes('cloud')) {
    avatarVisitUrl = (await getTempList(avatarUrlList))[0];
    if (avatarVisitUrl) {
      event.avatarVisitUrl = avatarVisitUrl;
    } else {
      event.avatarVisitUrl = avatarUrlStr;
    }
  }

  // 只写入允许的用户字段，避免 openId/requestId 等导致数据库报错
  const allowedKeys = [
    'nickName', 'avatar', 'avatarUrl', 'avatarVisitUrl', 'birthDay', 'city',
    'signature', 'gender', 'constellation', 'mbti', 'relationshipStatus',
    'school', 'imgList', 'labels', 'mobile'
  ];
  const data = {};
  for (const key of allowedKeys) {
    if (event[key] !== undefined) {
      data[key] = event[key];
    }
  }
  if (Object.keys(data).length === 0) {
    return { code: 200 };
  }

  await db.collection('user').where({ openId }).update({ data });

  await setRedisExpire(openId, 0);

  await db.collection('log_user_info').add({
    data: {
      openId: openId,
      oldUserInfo,
      newUserInfo: data,
      createTime: new Date().getTime(),
    }
  })

  return {
    code: 200
  }
 

}


exports.updateUserInfo = updateUserInfo;


