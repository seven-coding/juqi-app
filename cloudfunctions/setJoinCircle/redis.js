const redis = require('redis')


let client = redis.createClient({
  host: "sh-crs-3cfk83bh.sql.tencentcdb.com",
  port:20827,
  password: 'juqi@redis123'
})



// 查询当日电台开发小程序
async function getRedisValue(key) {


  let res = await new Promise((resolve, reject) => {
    client.get(key, function (err, reply) {
      if (err) {
        console.log(err)
        resolve({
          err
        })
      };
      console.log(reply)

      if (reply){
        resolve(reply.toString());
      } else {
        resolve("");
      }
    });
  });

  return res;
}


async function setRedisValue(key, value) {
  let res = await client.set(key, value);
  console.log(res);
}

// 设置过期时间
async function setRedisExpire(key, time) {
  return client.expire(key,time)
}

exports.getRedisValue = getRedisValue;
exports.setRedisValue = setRedisValue;
exports.setRedisExpire = setRedisExpire;