// 获取推荐话题
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');


async function getRecomTopic() {

  let redisKey = "RECOMMEND_TOPIC";
  let redisResult = await getRedisValue(redisKey)

  if (false) {

    redisResult = JSON.parse(redisResult);
    return {
      code: 200,
      data: redisResult
    };
  } else {

    let topics = (await db.collection('topics').where({
      recommend: true
    }).get()).data;
    console.log('未命中缓存');

    await setRedisValue(redisKey, JSON.stringify(topics))
    await setRedisExpire(redisKey, 60 * 60)

    return {
      code: 200,
      data: topics
    }
  }


}


exports.getRecomTopic = getRecomTopic;