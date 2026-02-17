// 帖子、评论点赞
// id: string 必填  动态id
// to  string 必填  点赞用户对象的openId
// type: 1.动态点赞，2.动态取消点赞，3 评论点赞 4.评论取消点赞
// firstIndex:   非必填，number, 评论第一层index 
// secondIndex: 非必填，number, 评论第一层index 

const cloud = require('wx-server-sdk')
const { likeToDyn } = require('./likeToDyn');
const { unlikeToDyn } = require('./unlikeToDyn');
const { likeToCom } = require('./likeToCom');
const { unlikeToCom } = require('./unlikeToCom');
const { verifyRegister } = require('./verifyRegister');

// 与 appApi 一致的环境 ID，用于未传 envId 时按 dataEnv 兜底
const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';
const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';

// 云函数入口函数
exports.main = async (event, context) => {
  // 按请求指定环境初始化，避免查错库（与 getDynDetail 一致）
  const envId = event.envId || (event.dataEnv === 'prod' ? PROD_ENV_ID : TEST_ENV_ID);
  cloud.init({ env: envId });
  console.log('[likeOrUnlikeV201] env: event.envId=%s, event.dataEnv=%s, 使用 envId=%s, id=%s', event.envId, event.dataEnv, envId, event.id);

  let { source } = event;
  let openId;

  if (source) {
    openId = event.ownOpenId || event.openId
  } else {
    const wxContext = cloud.getWXContext()
    openId = wxContext.OPENID;
  }
  
  let createTime = new Date().valueOf();

  let { firstIndex, secondIndex, id, type, to, likeToType } = event;
  console.log(`请求参数：`)
  console.log(event)

  if (type == 1) {
    // 动态点赞
    let result = await likeToDyn(event);
    return result;
  } else if (type == 2) {
    // 动态取消点赞
    let result = await unlikeToDyn(event);
    return result;
  } else if (type == 3) {
    // 评论点赞
    let result = await likeToCom(event);
    return result;
  } else if (type == 4) {
    // 评论点赞
    let result = await unlikeToCom(event);
    return result;
  } else if (type == 'test') {
    await verifyRegister(openId);
    
  } 
}