// 云函数入口文件
// 支持 event.openId（appApi 互调时传入）与 event.dataEnv（与 getMessagesNew 一致，写库环境）
const cloud = require('wx-server-sdk');
const { setMes } = require('./setMes');
const { deleteBothMes } = require('./deleteBothMes');

const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';
const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // appApi 调用时传 openId，云函数互调时 wxContext.OPENID 常为空，优先使用 event.openId
  const openIdFromEvent = event.openId;
  const openId = (openIdFromEvent != null && openIdFromEvent !== '')
    ? openIdFromEvent
    : wxContext.OPENID;
  if (openIdFromEvent != null && openIdFromEvent !== '') {
    console.log('[setMessage] 使用 event.openId');
  }

  // 按 dataEnv 切换写库环境，与 getMessagesNew 读库一致（App 读 prod 时已读/删除写 prod）
  const dataEnv = event.dataEnv || 'test';
  const envId = dataEnv === 'prod' ? PROD_ENV_ID : TEST_ENV_ID;
  cloud.init({ env: envId });
  global.__SETMESSAGE_DB__ = cloud.database();
  console.log('[setMessage] dataEnv=', dataEnv, ', envId=', envId);

  const { type, mesType } = event;

  console.log(event);

  if (type == 1 && mesType == 23) {
    const result = await deleteBothMes(event, openId);
    return result;
  }
  if (type == 1) {
    const result = await setMes(event, openId);
    return result;
  }

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};