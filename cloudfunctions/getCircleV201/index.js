// 云函数入口文件
// type: 1 获取用户关注电站
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command;
const {getCircles} = require('getCircles');
const {getJoinCircle} = require('getJoinCircle');

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    let { type } = event;
    console.log(type)

    if (type == 1) {
      let result = await getJoinCircle(event);
      return result;
    } else {
      let result = await getCircles(event);
      return result;
    }


  } catch (error) {
    console.log(error)
    return {
      error,
      code: 400,
      message: ''
    }
  }
}