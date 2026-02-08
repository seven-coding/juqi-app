// 云函数入口文件
// 搜索接口
// type: 1 用户
// type: 2 内容
// type: 3 话题
// type: 4 电站
const cloud = require('wx-server-sdk')

cloud.init()
const { getUserRec } = require('getUserRec');
const { getDynsRec } = require('getDynsRec');
const { getTopicRec } = require('getTopicRec');
const { getCircleRec } = require('getCircleRec');
const { getFansRec } = require('getFansRec');
const { getFollowRec } = require('getFollowRec');
const {errorCode} = require('./errorCode');


// 云函数入口函数
exports.main = async (event, context) => {
  try {
    let {
      type, //类型
      keyword, //关键词
      page = 1, //页数
      limit = 20 //数量
    } = event;

    if (!type) {
      return errorCode.errorCode;
    }
    console.log(event)

    keyword && (keyword = keyword.trim());

    // 文字校验
    if (keyword && keyword.length) {
      try {
        // 避免前后多余空格
        let result = await cloud.openapi.security.msgSecCheck({
          content: keyword
        });

        if (result.errCode !== 0) {
          return {
            code: result.errCode,
            message: '关键词包含违规内容'
          }
        }
      } catch(error) {
        console.log(error)
        return {
          code: 400,
          message: '内容安全检查失败'
        }
      }
    }

    if (type == 1) {
      let result = await getUserRec(keyword, page, limit);
      return result
    } else if (type == 2){
      let result = await getDynsRec(keyword, page, limit);
      return result
    }  else if (type == 3){
      let result = await getTopicRec(keyword, page, limit);
      return result
    }  else if (type == 4){
      let result = await getCircleRec(keyword, page, limit);
      return result
    } else if (type == 5){
      // 用户粉丝处搜索好友
      let result = await getFansRec(event, page, limit);
      return result
    } else if (type == 6){
      // 用户关注处搜索好友
      let result = await getFollowRec(event, page, limit);
      return result
    }


  } catch (error) {
    console.log(error);
    return {
      code: 400,
      message: '执行报错，请直接反馈到橘气家长群'
    }
  }
}