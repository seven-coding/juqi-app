// 获取圈子列表
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const { dealData } = require('./dealData.js')
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');
const {
  BALACK_USER
} = require('./black');
const {
  ADMIN_USER
} = require('./admin');
const {
  getNoticeDyn
} = require("./getNoticeDyn")


// 圈子列表动态
async function getCircleDyns(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command

  let { limit = 20, circleId, publicTime, verifyStatus, type } = event;

  let count, result;
  let query, redisValue;

  if (circleId == "04dd9d416378c3e300667b726c5b3124") {
    // 获取公告栏
    let result = await getNoticeDyn(event);
    return result;
  }
  
  if (verifyStatus) {
    // 新人区动态
    query = {
      circleId: "aa133ce55f52335900c50c9626857df6",
      dynStatus: 1,
      verifyStatus: 1,
      hiddenStatus: _.neq(1),
      isDelete: _.neq(1),
    };
    redisValue = publicTime ? `${publicTime}-${verifyStatus}` : `NEW_DYN_${verifyStatus}`;
  } else  {
    let circleInfo = (await db.collection('circle').doc(circleId).get()).data;
    let {circleDynStatus} = circleInfo;

    // 正常圈子动态
    query = {
      circleId,
      dynStatus: circleDynStatus ? circleDynStatus : 1,
      hiddenStatus: _.neq(1),
      isDelete: _.neq(1),
    };
    redisValue = publicTime ? `${publicTime}-${circleId.split(8)[0]}` : `NEW_DYN_${circleId.split(8)[0]}`;
  } 

  //console.log('redisValue:', redisValue)
  let redisDyns = await getRedisValue(redisValue)
  console.log('get circle dyns rediskey', redisValue);

  if (redisDyns) {
    try {
      redisDyns = JSON.parse(redisDyns);
    }catch(error) {
      console.log("失败")
      console.log(error)
      redisDyns = ""
    }
  }


  if (redisDyns) {
    console.log('get circle dyns 命中缓存');
    try {

      return redisDyns;
    } catch(error) {
      console.log(error)
    }
  } else {
    // 计算总数
    count = await db.collection('dyn').where(query).count();

    let sort;
    // 存在查询时间
    if (publicTime) {
      query.publicTime = _.lt(publicTime);
      sort = {
        publicTime: -1,
      };
    } else {
      sort = {
        // topTime: -1, //圈子置顶根据该置顶消息置顶
        publicTime: -1,
      }
    }

    result = await dealData(query, sort, limit, ownOpenId);


    if (result.list.length) {
      await setRedisValue(redisValue, JSON.stringify({
        code: 200,
        dynList: result.list,
        openId: ownOpenId,
        count: count.total,
        publicTime: result.publicTime
      }))


      if (!redisValue.includes("NEW_DYN")) {
        await setRedisExpire(redisValue, 60 * 5 * 10)
      } else {
        await setRedisExpire(redisValue, 60 * 5)
      }
      console.log("get circle dyns 没有缓存, 设置缓存：")
    }
    
    return {
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count: count.total,
      publicTime: result.publicTime
    };
  }

}

exports.getCircleDyns = getCircleDyns;

