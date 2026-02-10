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
 * 根据source、dataEnv 初始化云开发实例
 * 返回完整的数据库工具集 {db, _, $}，供模块统一使用
 * 
 * 核心设计：
 * - cloud.init() 根据 dataEnv 切换环境，确保：
 *   1. cloud.database() 读写正确的数据库
 *   2. cloud.callFunction() 调用对应环境的核心层云函数
 *      （核心层云函数在生产环境中已由小程序部署，可正常调用）
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

module.exports = {
  initCloudBySource,
  getTestDb,
  TEST_ENV_ID,
  PROD_ENV_ID
};
