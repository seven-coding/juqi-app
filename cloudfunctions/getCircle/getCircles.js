// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  CONFIG
} = require('./config')
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

const REDIS_KEY = "GET_CIRCLE_DEFAULT";

// 添加消息
async function getCircles(data) {

  let redisDyns = await getRedisValue(REDIS_KEY)

  if (redisDyns) {
    console.log('命中缓存');

    redisDyns = JSON.parse(redisDyns);
    return redisDyns;
  } else {

    let result = await db.collection('circle').aggregate()
    .match({
      status: true
    })
    .sort({
      sort: 1,
    })
    .project({
      follow: 0,
    })
    .limit(1000)
    .end();

    let { list } = result;

    await setRedisValue(REDIS_KEY, JSON.stringify({
      code: 200,
      data: list
    }))
    await setRedisExpire(REDIS_KEY, 60 * 60 )
    console.log("没有缓存, 设置缓存：")

    return {
      code: 200,
      data: list
    };
  }
}


exports.getCircles = getCircles;