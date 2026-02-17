// 与 appApi/utils/env.js 一致，用于 publishDyn 按 dataEnv 写库
const cloud = require('wx-server-sdk');

const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';
const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';

const ENV_KEY = '__PUBLISHDYN_ENV_ID__';

/**
 * 在 main 入口第一行调用，根据 event.dataEnv 设置当前请求的写库环境
 * @param {object} event - 云函数 event，含 dataEnv: 'test' | 'prod'
 */
function initByDataEnv(event) {
  const dataEnv = (event && event.dataEnv) || 'test';
  const envId = dataEnv === 'prod' ? PROD_ENV_ID : TEST_ENV_ID;
  global[ENV_KEY] = envId;
  cloud.init({ env: envId, traceUser: true });
  console.log('[publishDyn/env] initByDataEnv - dataEnv:', dataEnv, ', envId:', envId);
}

/**
 * 获取当前请求对应环境的 db（必须在 main 内 initByDataEnv 之后调用）
 */
function getDb() {
  const envId = global[ENV_KEY] || TEST_ENV_ID;
  cloud.init({ env: envId, traceUser: true });
  return cloud.database();
}

/** 第一期：App 统一用 publishDynV201 */
function getPublishDynCallName() {
  return 'publishDynV201';
}

module.exports = {
  initByDataEnv,
  getDb,
  getPublishDynCallName,
  TEST_ENV_ID,
  PROD_ENV_ID,
};
