/**
 * 将正式环境的 circle 集合同步至测试环境
 * - 正式环境只读，测试环境写入
 * - 按 _id 幂等：已存在则 update，不存在则 add
 *
 * 使用（在 cloudfunctions 目录下）：
 *   node scripts/sync-circle-prod-to-test.js
 *
 * 环境变量（可选，默认与 appApi/utils/env.js 一致）：
 *   TEST_ENV_ID, PROD_ENV_ID
 *   本地运行需配置腾讯云密钥：TENCENT_SECRET_ID, TENCENT_SECRET_KEY
 */
const path = require('path');
[
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../apiServer/.env'),
  path.join(__dirname, '../../.env')
].forEach(p => {
  try { require('dotenv').config({ path: p }); } catch (_) { /* optional */ }
});
if (process.env.CLOUD_BASE_ID && !process.env.TENCENT_SECRET_ID) process.env.TENCENT_SECRET_ID = process.env.CLOUD_BASE_ID;
if (process.env.CLOUD_BASE_KEY && !process.env.TENCENT_SECRET_KEY) process.env.TENCENT_SECRET_KEY = process.env.CLOUD_BASE_KEY;

const cloudbase = require('@cloudbase/node-sdk');

const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';
const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';
const secretId = process.env.TENCENT_SECRET_ID || process.env.TENCENTCLOUD_SECRETID;
const secretKey = process.env.TENCENT_SECRET_KEY || process.env.TENCENTCLOUD_SECRETKEY;

const COLLECTION = 'circle';
/** 单次从 prod 拉取上限，避免一次过大 */
const MAX_FETCH = 500;

async function main() {
  if (!secretId || !secretKey) {
    console.error('[sync-circle] 本地运行需配置腾讯云密钥，例如：');
    console.error('  export TENCENT_SECRET_ID=xxx');
    console.error('  export TENCENT_SECRET_KEY=xxx');
    console.error('或在 cloudfunctions/.env 或 apiServer/.env 中配置 TENCENT_SECRET_ID、TENCENT_SECRET_KEY（或 CLOUD_BASE_ID、CLOUD_BASE_KEY）');
    process.exit(1);
  }

  console.log('[sync-circle] 正式环境 circle → 测试环境');
  console.log('PROD_ENV_ID=', PROD_ENV_ID);
  console.log('TEST_ENV_ID=', TEST_ENV_ID);
  console.log('');

  const prodApp = cloudbase.init({ env: PROD_ENV_ID, secretId, secretKey });
  const testApp = cloudbase.init({ env: TEST_ENV_ID, secretId, secretKey });
  const prodDb = prodApp.database();
  const testDb = testApp.database();

  let list = [];
  try {
    const res = await prodDb.collection(COLLECTION).limit(MAX_FETCH).get();
    if (res && res.data) list = res.data;
  } catch (e) {
    console.error('[sync-circle] 从正式环境读取失败:', e.message);
    process.exit(1);
  }

  if (list.length === 0) {
    console.log('[sync-circle] 正式环境 circle 集合无数据，跳过写入。');
    return;
  }

  console.log(`[sync-circle] 共 ${list.length} 条，开始写入测试环境…`);

  let added = 0;
  let updated = 0;
  let failed = 0;

  for (const item of list) {
    const id = item._id;
    if (id == null || id === '') {
      failed++;
      continue;
    }
    try {
      await testDb.collection(COLLECTION).add({ data: item });
      added++;
    } catch (err) {
      const msg = String(err.message || err.errMsg || '');
      const isDuplicate = err.code === 'DATABASE_DUPLICATE_KEY' || err.errCode === -502003 ||
        msg.includes('duplicate') || msg.includes('already exists');
      if (isDuplicate) {
        try {
          await testDb.collection(COLLECTION).where({ _id: id }).update({ data: item });
          updated++;
        } catch (e2) {
          console.warn(`[sync-circle] 更新 _id=${id} 失败:`, e2.message);
          failed++;
        }
      } else {
        console.warn(`[sync-circle] _id=${id} 写入失败:`, err.message);
        failed++;
      }
    }
  }

  console.log(`[sync-circle] 完成: 新增 ${added}, 更新 ${updated}, 失败 ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
