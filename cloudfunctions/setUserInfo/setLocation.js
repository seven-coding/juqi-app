// type:
//  1 保存地理位置
//  2:设置附近的人隐身
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const { updateUserInfo } = require('./utils/userInfo');

// 更新地理位置
async function setLocation(event, openId) {
  let {
    longitude,
    latitude
  } = event;

  if (!longitude || !latitude) {
    await updateUserInfo(openId, {
      location: _.remove(),
      locTime: _.remove(),
    })

    return {
      code: 200
    }
  } else {
    await updateUserInfo(openId, {
      location: db.Geo.Point(longitude, latitude),
      locTime: new Date().valueOf(),
    })
  
    return {
      code: 200
    }
  }
  
}

exports.setLocation = setLocation;