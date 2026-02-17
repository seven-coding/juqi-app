// 设置话题想过
const cloud = require('wx-server-sdk')
// type：
// 1.根据话题输入词进行话题推荐
// 2.默认话题推荐
// 3.获取热门话题

cloud.init()
const db = cloud.database()
const {errorCode} = require('./errorCode');
const { getRecomTopic } = require('./getRecomTopic');
const { getTopicList } = require('./getTopicList');
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { type, topic, circleId } = event;

  try {
    if (type === 1) {
      // 增加话题
      if (!topic) {
        return errorCode.LIMIT_QUERY
      }
      let topics = (await db.collection('topics').where({
        topic: new db.RegExp({
          regexp: topic,
          options: 'i',
        })
      }).get()).data;

      return {
        code: 200,
        data: topics
      }
    } else if (type === 2) {
      let result = getRecomTopic();
      return result;
      
    } else if (type === 3) {
      console.log(topic);
      
      let topicInfo = (await db.collection('topics') .aggregate().match({
        topic
      }).lookup({
        from: 'user',
        localField: 'openId',
        foreignField: 'openId',
        as: 'fromUser',
      }).end()).list;

      return {
        code: 200,
        data: topicInfo[0]
      }
    } else if (type === 4) {
      // 话题列表
      let result = getTopicList(event);
      return result;
    }
    
  } catch (error) {
    return {
      code: 400,
      error
    }
  }
}