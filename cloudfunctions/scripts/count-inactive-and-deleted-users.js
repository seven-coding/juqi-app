/**
 * 统计：已注销用户、2年未活跃用户及关联集合文档数（用于评估数据清理可节约费用）
 * 默认查生产环境；需配置 CLOUD_BASE_ID / CLOUD_BASE_KEY（或 TENCENT_SECRET_ID / TENCENT_SECRET_KEY）
 *
 * 使用：在 cloudfunctions 目录下执行
 *   node scripts/count-inactive-and-deleted-users.js
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: path.join(__dirname, '../../apiServer/.env') });
} catch (_) {}

const cloudbase = require('@cloudbase/node-sdk');
const PROD_ENV_ID = process.env.TCB_ENV_PROD || process.env.PROD_ENV_ID || 'prod-juqi-7glu2m8qfa31e13f';

const secretId = process.env.CLOUD_BASE_ID || process.env.TENCENT_SECRET_ID;
const secretKey = process.env.CLOUD_BASE_KEY || process.env.TENCENT_SECRET_KEY;

if (!secretId || !secretKey) {
  console.error('请配置 CLOUD_BASE_ID/CLOUD_BASE_KEY 或 TENCENT_SECRET_ID/TENCENT_SECRET_KEY');
  process.exit(1);
}

const app = cloudbase.init({ secretId, secretKey, env: PROD_ENV_ID });
const db = app.database();
const _ = db.command;

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const cutoffTime = Date.now() - TWO_YEARS_MS;

async function count(collection, query = {}) {
  try {
    const res = await db.collection(collection).where(query).count();
    return res.total ?? 0;
  } catch (e) {
    if (String(e.message || e.code || '').includes('not exist') || (e.errCode === -502005)) return null;
    throw e;
  }
}

async function main() {
  console.log('环境:', PROD_ENV_ID);
  console.log('截止「2年未活跃」时间戳:', cutoffTime, new Date(cutoffTime).toISOString());
  console.log('');

  const userTotal = await count('user', {});
  const userDeleted = await count('user', { joinStatus: -1 });
  const userBanned = await count('user', { joinStatus: -2 });

  let userInactive2y = null;
  try {
    const res = await db.collection('user')
      .where({
        joinStatus: 1,
        realEnterTime: _.lt(new Date(cutoffTime))
      })
      .count();
    userInactive2y = res.total ?? 0;
  } catch (e) {
    console.error('2年未活跃统计失败:', e.message);
  }

  const dynTotal = await count('dyn', {});
  // 优质帖子：用户置顶 或 互动达阈值（保留不删）
  let qualityDynCount = null;
  try {
    const qualityRes = await db.collection('dyn').where(_.or([
      { userTopTime: _.gt(0) },
      { likeNums: _.gte(10) },
      { commentNums: _.gte(5) }
    ])).count();
    qualityDynCount = qualityRes.total ?? 0;
  } catch (e) {
    console.error('优质帖子统计失败:', e.message);
  }
  const userFolloweeTotal = await count('user_followee', {});
  const messagesOtherTotal = await count('messagesOther', {});
  const messagesTypeTotal = await count('messagesType', {});
  const messagesUserTotal = await count('messagesUser', {});
  const dynCommentsTotal = await count('dynComments', {});
  const userSecretTotal = await count('user_secret', {});

  const out = {
    env: PROD_ENV_ID,
    user: {
      total: userTotal,
      deleted: userDeleted,
      banned: userBanned,
      inactive2y: userInactive2y,
      deletedPct: userTotal ? ((userDeleted / userTotal) * 100).toFixed(2) + '%' : '-',
      inactive2yPct: userTotal && userInactive2y != null ? ((userInactive2y / userTotal) * 100).toFixed(2) + '%' : '-'
    },
    qualityDyn: qualityDynCount,
    related: {
      dyn: dynTotal,
      user_followee: userFolloweeTotal,
      messagesOther: messagesOtherTotal,
      messagesType: messagesTypeTotal,
      messagesUser: messagesUserTotal,
      dynComments: dynCommentsTotal,
      user_secret: userSecretTotal
    }
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
