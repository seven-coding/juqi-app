const redis = require('redis')

let client = redis.createClient({
  host: "sh-crs-3cfk83bh.sql.tencentcdb.com",
  port: 20827,
  password: 'juqi@redis123'
})



// get
async function getRedisValue(key) {

  let res = await new Promise((resolve, reject) => {
    client.get(key, function (err, reply) {
      if (err) {
        console.log(err)
        resolve({
          err
        })
      };
      // reply 为 key 不存在时为 null，不打印避免日志噪音

      if (reply) {
        resolve(reply.toString());
      } else {
        resolve("");
      }
    });
  });

  return res;
}

// 设置过期时间
async function setRedisExpire(key, time) {
  return client.expire(key, time)
}



// set
async function setRedisValue(key, value) {
  return client.set(key, value)
}

exports.getRedisValue = getRedisValue;
exports.setRedisValue = setRedisValue;
exports.setRedisExpire = setRedisExpire;