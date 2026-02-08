/**
 * 云函数：从正式环境同步首页动态到测试环境（最多 50 条）
 * 用于 App 测试环境验证首页各 type：最新、公告板、热榜等
 * 仅读写：正式环境只读，测试环境写入
 */
const cloudbase = require('@cloudbase/node-sdk');
const { syncHomeDyn } = require('./sync');

const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';
const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';

exports.main = async (event, context) => {
  try {
    console.log('[syncHomeDynFromProd] 开始，PROD=', PROD_ENV_ID, 'TEST=', TEST_ENV_ID);

    const prodApp = cloudbase.init({ env: PROD_ENV_ID });
    const testApp = cloudbase.init({ env: TEST_ENV_ID });
    const prodDb = prodApp.database();
    const testDb = testApp.database();

    const result = await syncHomeDyn(prodDb, testDb);

    console.log('[syncHomeDynFromProd] 完成', result);

    return {
      code: 200,
      message: '首页动态同步完成',
      data: result
    };
  } catch (error) {
    console.error('[syncHomeDynFromProd] 失败', error);
    return {
      code: 500,
      message: error.message || '同步失败',
      error: error.stack
    };
  }
};
