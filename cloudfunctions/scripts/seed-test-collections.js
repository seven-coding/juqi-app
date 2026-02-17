/**
 * 测试环境 NoSQL 集合补全 + 空集合测试数据（每集合最多 100 条）
 * - 仅写入测试环境，生产环境只读
 * - 幂等：已有集合不重复创建；空集合从 prod 拉取最多 100 条写入 test
 *
 * 使用：在 cloudfunctions 目录下执行
 *   node scripts/seed-test-collections.js
 *
 * 环境变量：
 *   TEST_ENV_ID, PROD_ENV_ID（可选，默认与 appApi/utils/env.js 一致）
 *   本地运行需配置腾讯云密钥：TENCENT_SECRET_ID, TENCENT_SECRET_KEY（云函数内可省略）
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (_) { /* optional */ }
const cloudbase = require('@cloudbase/node-sdk');

const TEST_ENV_ID = process.env.TEST_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';
const PROD_ENV_ID = process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';
const MAX_SEED = 100;

/** App 代码引用的全部集合（与 docs/collections-app-no-sql.md 一致） */
const REQUIRED_COLLECTIONS = [
  'user', 'dyn', 'dynComments', 'dynCommentReplay', 'dynFavorite',
  'user_followee', 'user_black', 'user_no_see', 'blackList', 'topics',
  'circle', 'circle_follow', 'circle_apply_join', 'messagesOther', 'messagesType', 'messagesUser',
  'messageChat', 'chatIds', 'log_admin', 'user_secret', 'shopBP', 'shopLog', 'inviteCodes', 'userGeo',
  'message', 'message_visit', 'trial_periods'
];

/** 集合不存在错误判定 */
function isCollectionNotExistError(err) {
  const code = err.errCode ?? err.code ?? '';
  const msg = String(err.message || err.errMsg || err).toLowerCase();
  return code === -502005 || code === 'DATABASE_COLLECTION_NOT_EXIST' ||
    msg.includes('collection not exist') || msg.includes('not exist');
}

/** 在指定 db 上检测集合是否存在，若存在则返回条数，否则返回 null */
async function getCollectionCount(db, name) {
  try {
    const res = await db.collection(name).count();
    return (res && res.total !== undefined) ? res.total : 0;
  } catch (e) {
    if (isCollectionNotExistError(e)) return null;
    throw e;
  }
}

/** 在测试环境创建缺失集合：写入一条最小文档以触发创建 */
async function ensureCollectionExists(testDb, name, prodDb) {
  const count = await getCollectionCount(testDb, name);
  if (count !== null) return { created: false, reason: 'exists' };

  let doc = null;
  try {
    const res = await prodDb.collection(name).limit(1).get();
    if (res && res.data && res.data.length > 0) doc = res.data[0];
  } catch (_) { /* prod 无数据或集合也不存在 */ }

  if (!doc) doc = getMinimalDoc(name);
  if (!doc) doc = { _seed: true, createdAt: Date.now() };

  await testDb.collection(name).add({ data: doc });
  return { created: true };
}

/** 部分集合的最小占位文档（prod 无数据时用） */
function getMinimalDoc(name) {
  const minimal = {
    user_no_see: { openId: 'test_openid_app', noSeeId: 'test_other', type: 1 },
    user_black: { openId: 'test_openid_app', blackId: 'test_other' },
    blackList: { openId: 'test_openid_app' },
    dynFavorite: { openId: 'test_openid_app', dynId: 'test_dyn_id', favoriteFlag: '0' },
    messagesOther: { to: 'test_openid_app', type: 0, status: 0 },
    messagesType: { to: 'test_openid_app', status: 0 },
    messagesUser: { openId: 'test_openid_app' },
    messageChat: { openId: 'test_openid_app' },
    chatIds: { openId: 'test_openid_app' },
    log_admin: { action: 'seed', createdAt: Date.now() },
    user_secret: { openId: 'test_openid_app' },
    shopBP: { openId: 'test_openid_app' },
    shopLog: { openId: 'test_openid_app' },
    inviteCodes: { code: 'TESTCODE', openId: 'test_openid_app' },
    userGeo: { openId: 'test_openid_app', location: {} },
    message: { _seed: 1 },
    message_visit: { _seed: 1 },
    trial_periods: { _seed: 1 },
    circle: { title: '测试圈子', desc: '', followCircleNums: 0 },
    circle_follow: { circleId: '', openId: 'test_openid_app' },
    circle_apply_join: { circleId: '', openId: 'test_openid_app', status: 0 },
    messageChat: { openId: 'test_openid_app' }
  };
  return minimal[name] || null;
}

/** 将 prod 某集合最多 limit 条写入 test（幂等：重复则 update） */
async function seedFromProd(prodDb, testDb, name, limit = MAX_SEED) {
  let list = [];
  try {
    const res = await prodDb.collection(name).limit(limit).get();
    if (res && res.data) list = res.data;
  } catch (e) {
    console.warn(`[seed] 从 prod 读取 ${name} 失败:`, e.message);
    return 0;
  }
  if (list.length === 0) return 0;

  let n = 0;
  for (const item of list) {
    try {
      await testDb.collection(name).add({ data: item });
      n++;
    } catch (err) {
      const msg = String(err.message || err.errMsg || '');
      if (err.code === 'DATABASE_DUPLICATE_KEY' || msg.includes('duplicate') || msg.includes('already exists')) {
        try {
          if (item._id != null) {
            await testDb.collection(name).where({ _id: item._id }).update({ data: item });
            n++;
          }
        } catch (_) { /* ignore */ }
      }
    }
  }
  return n;
}

async function main() {
  console.log('测试环境集合补全与测试数据');
  console.log('TEST_ENV_ID=', TEST_ENV_ID, ', PROD_ENV_ID=', PROD_ENV_ID);
  console.log('仅写入测试环境，生产环境只读。\n');

  const prodApp = cloudbase.init({ env: PROD_ENV_ID });
  const testApp = cloudbase.init({ env: TEST_ENV_ID });
  const prodDb = prodApp.database();
  const testDb = testApp.database();

  const missing = [];
  const empty = [];

  for (const name of REQUIRED_COLLECTIONS) {
    const count = await getCollectionCount(testDb, name);
    if (count === null) missing.push(name);
    else if (count === 0) empty.push(name);
  }

  console.log('缺失集合（测试环境不存在）:', missing.length, missing);
  console.log('空集合（测试环境存在但无数据）:', empty.length, empty);

  // 1) 补全缺失集合
  console.log('\n--- 补全缺失集合 ---');
  for (const name of missing) {
    try {
      const result = await ensureCollectionExists(testDb, name, prodDb);
      console.log(`  ${name}:`, result.created ? '已创建' : '已存在');
    } catch (e) {
      console.error(`  ${name} 创建失败:`, e.message);
    }
  }

  // 2) 为空集合（含刚创建的）插入测试数据，每集合最多 MAX_SEED 条
  const emptyAfterCreate = [];
  for (const name of REQUIRED_COLLECTIONS) {
    const count = await getCollectionCount(testDb, name);
    if (count !== null && count === 0) emptyAfterCreate.push(name);
  }
  console.log('\n--- 为空集合写入测试数据（最多 ' + MAX_SEED + ' 条/集合）---');
  for (const name of emptyAfterCreate) {
    try {
      const n = await seedFromProd(prodDb, testDb, name, MAX_SEED);
      if (n === 0) {
        const doc = getMinimalDoc(name);
        if (doc) {
          await testDb.collection(name).add({ data: doc });
          console.log(`  ${name}: 已写入 1 条占位`);
        } else {
          await testDb.collection(name).add({ data: { _seed: true, createdAt: Date.now() } });
          console.log(`  ${name}: 已写入 1 条占位`);
        }
      } else {
        console.log(`  ${name}: 已同步 ${n} 条`);
      }
    } catch (e) {
      console.error(`  ${name} 写入失败:`, e.message);
    }
  }

  console.log('\n完成。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
