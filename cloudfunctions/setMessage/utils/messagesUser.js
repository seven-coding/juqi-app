const cloud = require('wx-server-sdk');
cloud.init();

function getDb() {
  return global.__SETMESSAGE_DB__ || (cloud.init(), cloud.database());
}

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

async function getMesUser(mesId) {
  let redisResult = await getRedisValue(mesId);

  if (redisResult) {
    console.log('命中缓存');
    redisResult = JSON.parse(redisResult);
    return redisResult;
  }

  const db = getDb();
  let res = (await db.collection('messagesUser').aggregate()
    .match({
      _id: mesId,
    })
    .end()).list;

    if (res.length) {

      await setRedisValue(mesId, JSON.stringify(res[0]))
      await setRedisExpire(mesId, 100)
      
      return res[0]
    } else {
      return "NO_MESSAGE"
    }
  }
}

async function setMesUser(data, updateInfo) {
  const db = getDb();
  const result = await db.collection('messagesUser').where(data).update({
    data: updateInfo
  });
  return result;
}

exports.getMesUser = getMesUser;
exports.setMesUser = setMesUser;