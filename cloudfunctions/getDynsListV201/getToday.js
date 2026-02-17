// 查询新动态
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  formatDate
} = require('./formatDate.js')
const { dealData } = require('./dealData.js')
const { getDynCount } = require('./utils/getDynCount.js')
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./utils/redis');
const {
  REDIS_CONFIG,
} = require('./utils/redisKey');

// 获取广场列表动态
async function getToday(event, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command
  const $ = db.command.aggregate;

  let { limit = 1000, publicTime, type = 2 } = event;
  limit = 1000;

  // countQuery 移到函数内部，确保 _ 已初始化
  let countQuery = {
    dynStatus: _.in([1, 6]), //dynStatus 可见、或者仅首页可见
    verifyStatus: _.exists(false) //非验证帖子
  };

  let count = await getDynCount(REDIS_CONFIG.GET_SQUARE_TOTAL, countQuery);
  console.log("计算总值：" + count)

  let redisValue = publicTime ? `${publicTime}-${type}-LIST` : `SQUARE_DYN_${type}-LIST`;
  console.log('redisValue:', redisValue)

  let redisDyns = await getRedisValue(redisValue)

    let result;

    let query;
x 
      query = {
        publicTime: _.gt(1622354425000),
        dynStatus: _.neq(0),
        // verifyStatus: _.exists(false)
      }
      

      if (!publicTime) {
        sort = {
          aaa: -1,
          publicTime: -1,
        }
      } else {
        query = {
          publicTime: -1,
        }
      }

    

    // 存在查询时间
    if (publicTime) {
      query.publicTime = _.lt(publicTime);
    }

    result = await dealData(query, sort, limit, ownOpenId);


    return {
      code: 200,
      dynList: result.list,
      openId: ownOpenId,
      count,
      publicTime: result.publicTime
    };
  // }

}

exports.getToday = getToday;