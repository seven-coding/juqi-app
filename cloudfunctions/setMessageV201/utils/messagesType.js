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

async function getMesType(mesId) {
  let redisResult = await getRedisValue(mesId);

  if (redisResult) {
    console.log('命中缓存');
    redisResult = JSON.parse(redisResult);
    return redisResult;
  }

  const db = getDb();
  let res = (await db.collection('messagesType').aggregate()
    .match({
      _id: mesId,
    })
    .end()).list;

  if (res.length) {
    await setRedisValue(mesId, JSON.stringify(res[0]));
    await setRedisExpire(mesId, 100);
    return res[0];
  }
  return "NO_MESSAGE";
}

async function setMesType(data, updateInfo) {
  const db = getDb();
  const result = await db.collection('messagesType').where(data).update({
    data: updateInfo
  });
  return result;
}

exports.getMesType = getMesType;
exports.setMesType = setMesType;