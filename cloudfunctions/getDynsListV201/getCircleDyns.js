// 获取圈子列表
// dynStatus 含义见同目录 dynStatus.js（与小程序统一：1=全部可见，2=仅圈子/树洞可见）
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
    let circleInfo = null;
    try {
      const circleRes = await db.collection('circle').doc(circleId).get();
      circleInfo = circleRes && circleRes.data ? circleRes.data : null;
    } catch (e) {
      const msg = (e.errMsg || e.message || '').toString();
      if (msg.includes('does not exist') || msg.includes('not exist')) {
        // 测试环境可能缺少 circle 文档：仍按 circleId 查 dyn，有则展示
        circleInfo = null;
      } else {
        throw e;
      }
    }
    // 与小程序统一：树洞/私密电站 dynStatus=2（仅圈子内可见），普通电站=1（全部可见）
    // 树洞发布走 sendSecretDyns 写 2；若 getCircle 未命中会误走 sendNormalDyn 写 1，故树洞查询兼容 [1,2]
    const circleDynStatus = circleInfo ? (circleInfo.circleDynStatus ?? (circleInfo.isSecret ? 2 : 1)) : null;
    const isSecret = circleInfo && (circleInfo.isSecret === true || circleInfo.isSecret === 1);

    query = {
      circleId,
      hiddenStatus: _.neq(1),
      isDelete: _.neq(1),
    };
    if (isSecret || circleDynStatus == null) {
      query.dynStatus = _.in([1, 2]); // 树洞标准为 2，兼容误写 1
    } else {
      query.dynStatus = circleDynStatus; // 与小程序一致：按 circle.circleDynStatus
    }
    redisValue = publicTime ? `${publicTime}-${circleId.slice(0, 8)}` : `NEW_DYN_${circleId.slice(0, 8)}`;
  } 

  // App 首屏/下拉刷新不读首屏缓存，保证进入电站页或刷新时能看到最新列表（与首页 getSquareList 一致）
  const skipCache = event.source === 'newApp' && !publicTime;
  let redisDyns = skipCache ? null : await getRedisValue(redisValue);
  if (skipCache) console.log('get circle dyns App 首屏/刷新，跳过 Redis 缓存');

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

