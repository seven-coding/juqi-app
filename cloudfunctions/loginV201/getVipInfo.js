// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const _ = db.command;
const $ = db.command.aggregate;

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');

// 获取会员配置
async function getVipInfo(openId) {
  try {
    let redisResult = await getRedisValue(`${openId}_secret`)
    console.log('命中缓存, redisResult', redisResult);

    if (redisResult) {
      console.log('命中缓存');

      redisResult = JSON.parse(redisResult);
      return redisResult;
    } else {
      let res = (await db.collection('user').aggregate()
        .match({
          openId,
        })
        .end()).list;
        
        return res[0]
    }
  } catch (error) {
    console.log(error)
  }
}


exports.getVipInfo = getVipInfo;