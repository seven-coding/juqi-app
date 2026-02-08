// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const {
  formatDate
} = require('./formatDate.js')
const {
  errorCode
} = require('./errorCode.js')
const {
  getFavoriteFlag
} = require('./utils/operate/getFavoriteFlag.js')
const {
  getLike
} = require('./getLike.js')

const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');

const {
  getDynDetail
} = require('./getDynDetail');

async function isFollowed(openId, followeeId) {
  const {
    total
  } = await db.collection('user_followee').where({
    openId,
    followeeId
  }).count()
  return total > 0
}

// 仅粉丝可见时逻辑处理
async function checkFollowAndStatus(openId, dynDetail) {
  if (!dynDetail) return;
  if (dynDetail.dynStatus === 9) {
    const isFollow = await isFollowed(openId, dynDetail.openId);
    if (!isFollow && openId !== dynDetail.openId) {
      throw {
        error: "unfollow",
        code: 400,
        message: '仅粉丝可见'
      };
    }
  }
}

// 查询帖子详情
async function getDynamicDetail(id, openId) {
  let redisValue = id;
  let dynDetail = await getRedisValue(redisValue);

  if (dynDetail) {
    console.log('命中缓存');
    dynDetail = JSON.parse(dynDetail);
  } else {
    dynDetail = await getDynDetail(id);
    if (!dynDetail) {
      throw { code: 404, message: '动态不存在' };
    }
    await setRedisValue(redisValue, JSON.stringify(dynDetail));
    await setRedisExpire(redisValue, 30); // 可考虑根据实际需求调整缓存时间
    console.log("没有缓存, 设置缓存：", dynDetail);
  }

  await checkFollowAndStatus(openId, dynDetail);
  return dynDetail;
}

// 云函数入口函数
exports.main = async (event, context) => {

  const wxContext = cloud.getWXContext();
  const openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  try {

    let {
      id,
      type
    } = event;
    // 获取帖子详情
    let dynDetail = await getDynamicDetail(id, openId);

    if (type == "basic_info" || dynDetail.dynStatus == 2) {
      // 获取帖子基本信息即可
      return {
        openId,
        data: dynDetail,
      }
    }

    dynDetail.ifLike = dynDetail.like && dynDetail.like.length && dynDetail.like.includes(openId);
    dynDetail.formatDate = formatDate(new Date(dynDetail.createTime).valueOf());

    let like = dynDetail.like && dynDetail.like.length ? await getLike(dynDetail.like) : [];
    dynDetail.like = like;

    let favoriteFlag = await getFavoriteFlag(dynDetail.openId, openId, id);
    dynDetail.favoriteFlag = favoriteFlag;

    return {
      openId,
      data: dynDetail
    };


  } catch (error) {

    console.log("报错", error)
    return {
      error,
      code: error.code || 500,
      message: error.message || 'Internal Server Error'
    };

  }

}