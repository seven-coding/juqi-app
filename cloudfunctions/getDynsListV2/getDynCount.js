
// 查询total数量
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  REDIS_CONFIG,
} = require('./redisKey');
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

const EXPIRE_TIME = 60 * 60; //秒数

// 查询total数量,
async function getDynCount(key, query) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command
  const $ = db.command.aggregate;

  let value = await getRedisValue(key)

  if (value) {
    console.log('命中缓存');
    return value;
  } else {
    // 计算总数
    const count = await db.collection('dyn').where(query).count();

    if (count && count.total) {
      await setRedisValue(key, count.total)

      await setRedisExpire(redisValue, EXPIRE_TIME)
      console.log(`没有total缓存, 设置缓存, ${key}总数量: ${count.total}`);
    }

    return count.total;
  }

}

exports.getDynCount = getDynCount;
