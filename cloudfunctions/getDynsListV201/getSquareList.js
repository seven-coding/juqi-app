// 查询新动态
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  dealData
} = require('./dealData.js')
const {
  getDynCount
} = require('./utils/getDynCount.js')
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');
const {
  REDIS_CONFIG,
} = require('./utils/redisKey');

const {
  dealFollowDyn
} = require('./dealFollowDyn')

const {
  dealBlackDyn
} = require("./dealBlackDyn");

const {
  formatDate
} = require('./formatDate.js');


// 获取广场列表动态
async function getSquareList(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command
  const VISIBLE_DYN_STATUS = _.in([1, 6]);
  
  // 获取环境标识，用于区分缓存
  const envId = event.envId || 'test-juqi-3g1m5qa7cc2737a1';
  const envPrefix = envId.includes('test') ? 'TEST_' : 'PROD_';
  
  // 诊断日志：验证环境
  console.log('[getSquareList v2.3.0] 开始查询 - envId:', envId, 'envPrefix:', envPrefix);

  let {
    limit = 20, publicTime, type = 2
  } = event;

  // let count = await getDynCount(REDIS_CONFIG.GET_SQUARE_TOTAL, countQuery);
  // console.log("计算总值：" + count)

  // 缓存 key 添加环境前缀，避免测试/生产数据混淆
  let redisValue = publicTime ? `${envPrefix}${publicTime}_Square_LIST` : `${envPrefix}SQUARE_DYN_Square_LIST`;
  console.log('redisValue:', redisValue)

  // App 首屏/下拉刷新不读首屏缓存，保证能看到最新内容且时间显示正确
  const skipCache = event.source === 'newApp' && !publicTime;
  let redisDyns = skipCache ? null : await getRedisValue(redisValue);
  if (skipCache) console.log('[getSquareList] App 首屏/刷新，跳过 Redis 缓存');

  if (redisDyns ) {
    console.log('命中缓存');
    redisDyns = JSON.parse(redisDyns);

    ownOpenId && (redisDyns.dynList = await dealBlackDyn(ownOpenId, redisDyns.dynList))
    ownOpenId && (redisDyns.dynList = await dealFollowDyn(ownOpenId, redisDyns.dynList))

    return redisDyns;
  } else {
    let result;
    // 风险控制在1；排除管理员/电站屏蔽、用户删除
    let query = {
      dynStatus: VISIBLE_DYN_STATUS,
      hiddenStatus: _.neq(1),
      isDelete: _.neq(1),
    }

    sort = {
      publicTime: -1,
    }

    // 存在查询时间
    if (publicTime) {
      query.publicTime = _.lt(publicTime);
    }

    // === 临时方案：使用简单查询代替aggregate，避免lookup超时 ===
    console.log('[getSquareList v2.4.0] 使用简单查询模式');
    
    try {
      // 构建查询条件（排除管理员/电站屏蔽、用户删除）
      let whereQuery = {
        dynStatus: _.in([1, 6]),
        hiddenStatus: _.neq(1),
        isDelete: _.neq(1),
      };
      if (publicTime) {
        whereQuery.publicTime = _.lt(publicTime);
      }
      
      // 简单查询，不使用 aggregate lookup
      const dynList = await db.collection('dyn')
        .where(whereQuery)
        .orderBy('publicTime', 'desc')
        .limit(limit)
        .get();
      
      console.log('[DEBUG] 简单查询结果数量:', dynList.data.length);
      
      // 获取最后一条的 publicTime 用于分页
      const lastPublicTime = dynList.data.length > 0 
        ? dynList.data[dynList.data.length - 1].publicTime 
        : null;
      
      // 批量获取用户信息（用简单的方式）
      const openIds = [...new Set(dynList.data.map(d => d.openId).filter(Boolean))];
      let userMap = {};
      
      if (openIds.length > 0) {
        try {
          // 分批查询用户，每批最多20个
          for (let i = 0; i < openIds.length; i += 20) {
            const batchIds = openIds.slice(i, i + 20);
            const users = await db.collection('user')
              .where({ openId: _.in(batchIds) })
              .field({
                openId: true,
                avatarUrl: true,
                avatarVisitUrl: true,
                nickName: true,
                avatarHat: true,
                dressPlace: true,
                labels: true,
                joinStatus: true,
                auth: true,
                vipStatus: true
              })
              .get();
            
            users.data.forEach(u => {
              userMap[u.openId] = u;
            });
          }
          console.log('[DEBUG] 成功获取用户数:', Object.keys(userMap).length);
        } catch (userErr) {
          console.warn('[WARN] 获取用户信息失败，使用默认值:', userErr.message);
        }
      }
      
      // 格式化结果
      const formattedList = dynList.data.map(item => {
        const rawUser = userMap[item.openId];
        const userInfo = rawUser ? {
          ...rawUser,
          avatarUrl: rawUser.avatarVisitUrl || rawUser.avatarUrl || ''
        } : {
          openId: item.openId,
          nickName: '用户',
          avatarUrl: '',
          avatarVisitUrl: ''
        };
        
        return {
          ...item,
          userInfo: [userInfo],
          userSecret: [{
            avatarHat: userInfo.avatarHat || '',
            dressPlace: userInfo.dressPlace || '',
            vipStatus: rawUser ? (rawUser.vipStatus || '') : '',
            avatarStatus: '',
            avatarHatId: '',
            avatarHatTime: ''
          }],
          ifLike: (item.like && item.like.includes(ownOpenId)) || false,
          likeStatus: (item.like && item.like.includes(ownOpenId)) || false,
          formatDate: formatDate(item.publicTime)
        };
      });
      
      result = {
        list: formattedList,
        publicTime: lastPublicTime
      };
      
      console.log('[DEBUG] 格式化完成 - list长度:', result.list.length);
      
    } catch (queryErr) {
      console.error('[ERROR] 简单查询失败:', queryErr.message);
      // 回退到原有方法
      result = await dealData(query, sort, limit, ownOpenId);
    }
    // === 临时方案结束 ===

    await setRedisValue(redisValue, JSON.stringify({
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      // count,
      publicTime: result.publicTime
    }))
    await setRedisExpire(redisValue, 5)
    console.log("没有缓存, 设置缓存：")

    // 过滤黑名单
    result.list = await dealBlackDyn(ownOpenId, result.list);
    result.list = await dealFollowDyn(ownOpenId, result.list)

    return {
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count: "",
      publicTime: result.publicTime
    };
  }

}

exports.getSquareList = getSquareList;