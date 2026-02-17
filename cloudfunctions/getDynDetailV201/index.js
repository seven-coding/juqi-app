// 云函数入口文件（支持 event.envId，与 appApi 列表同库，避免再次进入详情 404）
const cloud = require('wx-server-sdk');
// 不在顶层 init，在 main 内按 event.envId 初始化，避免「当前未指定env，将默认使用第一个创建的环境」导致查错库 404

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

async function isFollowed(openId, followeeId, db) {
  const {
    total
  } = await db.collection('user_followee').where({
    openId,
    followeeId
  }).count()
  return total > 0
}

// 仅粉丝可见时逻辑处理
async function checkFollowAndStatus(openId, dynDetail, db) {
  if (!dynDetail) return;
  if (dynDetail.dynStatus === 9) {
    const isFollow = await isFollowed(openId, dynDetail.openId, db);
    if (!isFollow && openId !== dynDetail.openId) {
      throw {
        error: "unfollow",
        code: 400,
        message: '仅粉丝可见'
      };
    }
  }
}

// 查询帖子详情（redisKey 加 envId 前缀，避免跨环境缓存串用）
async function getDynamicDetail(id, openId, envId, requestId) {
  const reqId = requestId || '-';
  const redisKey = envId ? `${envId}:dyn:${id}` : id;
  let dynDetail = await getRedisValue(redisKey);

  if (dynDetail) {
    console.log(`[reqId=${reqId}][getDynDetail] 命中缓存: dynId=${id}, envId=${envId || '-'}`);
    dynDetail = JSON.parse(dynDetail);
  } else {
    dynDetail = await getDynDetail(id);
    if (!dynDetail) {
      console.warn(`[reqId=${reqId}][getDynDetail] 404 动态不存在: dynId=${id}, envId=${envId || '-'}`);
      throw { code: 404, message: '动态不存在' };
    }
    await setRedisValue(redisKey, JSON.stringify(dynDetail));
    await setRedisExpire(redisKey, 30); // 可考虑根据实际需求调整缓存时间
    console.log(`[reqId=${reqId}][getDynDetail] 未命中缓存已设置: dynId=${id}, envId=${envId || '-'}`);
  }

  return dynDetail;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const requestId = event.requestId || '-';
  const reqId = requestId;
  // 与列表同库：appApi 传入 envId 时在此初始化，避免再次进入详情查错库导致 404
  const envId = event.envId || process.env.TCB_ENV_ID;
  if (envId) {
    cloud.init({ env: envId });
    console.log(`[reqId=${reqId}][getDynDetail] 按 envId 初始化: envId=${envId}`);
  }

  const wxContext = cloud.getWXContext();
  const openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  try {

    let {
      id,
      type
    } = event;
    console.log(`[reqId=${reqId}][getDynDetail] 入参: dynId=${id}, envId=${envId || '-'}, type=${type || '-'}`);
    // 获取帖子详情（传入 envId 做缓存 key 前缀）
    let dynDetail = await getDynamicDetail(id, openId, envId, requestId);

    const db = cloud.database();
    await checkFollowAndStatus(openId, dynDetail, db);

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

    console.error(`[reqId=${reqId}][getDynDetail] 错误: code=${error.code || 500}, message=${error.message || 'Internal Server Error'}, dynId=${event.id || '-'}`);
    return {
      error,
      code: error.code || 500,
      message: error.message || 'Internal Server Error'
    };

  }

}