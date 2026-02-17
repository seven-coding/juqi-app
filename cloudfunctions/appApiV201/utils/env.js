// 环境配置工具
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');

// 测试环境ID（可在 .env 中设置 TEST_ENV_ID 覆盖）
const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';
// 生产环境ID（可在 .env 中设置 PROD_ENV_ID 覆盖；用于 dataEnv='prod' 时切换到线上数据）
const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';

// 缓存当前初始化的环境ID，避免重复初始化
let _currentEnvId = null;

/**
 * 根据 source、dataEnv 初始化云开发实例，仅用于获取数据环境对应的 db。
 * 返回的 { db, _, $ } 供本请求内直连 DB 使用（数据环境由 dataEnv 决定）。
 * 若本请求内还会执行 cloud.callFunction，调用方应在取得 db 后调用 initCallEnvToSelf()，
 * 使 callFunction 只打本函数所在环境，禁止跨环境调用。
 *
 * @param {string} source - 来源标识，'v2'表示App请求
 * @param {object} context - 云函数上下文
 * @param {string} [dataEnv] - 数据环境：'prod' 使用生产库，否则使用测试库（App 设置页可切换）
 * @returns {object} { db, _, $ } 数据库实例和操作符
 */
function initCloudBySource(source, context, dataEnv) {
  const envId = (dataEnv === 'prod') ? PROD_ENV_ID : TEST_ENV_ID;
  
  console.log('[env.js] initCloudBySource - source:', source, 'dataEnv:', dataEnv || 'test', 'envId:', envId);
  
  // 只在环境变化或首次初始化时调用 cloud.init
  if (_currentEnvId !== envId) {
    console.log('[env.js] 初始化云开发环境 - 从', _currentEnvId || '(未初始化)', '切换到', envId);
    cloud.init({
      env: envId,
    });
    _currentEnvId = envId;
  }

  const db = cloud.database();
  const _ = db.command;
  const $ = db.command.aggregate;
  
  return { db, _, $ };
}

/**
 * 将 cloud 的调用目标设为本函数所在环境，保证后续 cloud.callFunction 只打本环境，不跨环境。
 * 应在已按 dataEnv 取得 event.db 后调用。
 */
function initCallEnvToSelf() {
  const selfEnvId = process.env.TCB_ENV_ID || TEST_ENV_ID;
  if (_currentEnvId !== selfEnvId) {
    console.log('[env.js] initCallEnvToSelf - 将 call 目标设为本环境，避免跨环境调用，envId:', selfEnvId);
    cloud.init({ env: selfEnvId });
    _currentEnvId = selfEnvId;
  }
}

/**
 * 获取测试环境数据库实例（兼容旧代码）
 * @returns {object} { db, _, $ } 数据库实例和操作符
 */
function getTestDb() {
  if (_currentEnvId !== TEST_ENV_ID) {
    cloud.init({
      env: TEST_ENV_ID,
    });
    _currentEnvId = TEST_ENV_ID;
  }
  
  const db = cloud.database();
  const _ = db.command;
  const $ = db.command.aggregate;
  
  return { db, _, $ };
}

/**
 * 第一期：App 统一调用 v201 名，不区分环境。
 * @param {string} baseName - 逻辑名（如 'getMessagesNew', 'getDynsListV2'）
 * @returns {string} 云函数名（getDynsListV2→getDynsListV201，likeOrUnlikeV2→likeOrUnlikeV201，其余 baseName + 'V201'）
 */
function getFuncName(baseName) {
  if (baseName === 'getDynsListV2' || baseName === 'likeOrUnlikeV2') return baseName.replace('V2', 'V201');
  return baseName + 'V201';
}

module.exports = {
  initCloudBySource,
  initCallEnvToSelf,
  getTestDb,
  getFuncName,
  TEST_ENV_ID,
  PROD_ENV_ID
};

