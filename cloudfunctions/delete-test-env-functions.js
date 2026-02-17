/**
 * 删除测试环境命名空间下的全部云函数（用于清空后重新部署全部 V201）。
 * 使用方式: 在 cloudfunctions 目录下执行 node delete-test-env-functions.js
 * 密钥与 deploy-all 相同，从 .env 或 apiServer/.env 读取。
 */
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;

function loadDeployEnv() {
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '..', '.env'),
    path.join(rootDir, '..', 'apiServer', '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      try {
        require('dotenv').config({ path: p });
      } catch (e) { /* dotenv 可选 */ }
    }
  }
  if (!process.env.TENCENT_SECRET_ID && process.env.CLOUD_BASE_ID) {
    process.env.TENCENT_SECRET_ID = process.env.CLOUD_BASE_ID;
  }
  if (!process.env.TENCENT_SECRET_KEY && process.env.CLOUD_BASE_KEY) {
    process.env.TENCENT_SECRET_KEY = process.env.CLOUD_BASE_KEY;
  }
}
loadDeployEnv();

const { getConfig, getClient } = require('./appApi/deploy.js');

async function main() {
  const testRcPath = path.join(rootDir, 'cloudbaserc.test.json');
  if (!fs.existsSync(testRcPath)) {
    console.error('未找到 cloudbaserc.test.json');
    process.exit(1);
  }
  const rc = JSON.parse(fs.readFileSync(testRcPath, 'utf8'));
  const envId = rc.envId;
  if (!envId) {
    console.error('cloudbaserc.test.json 中缺少 envId');
    process.exit(1);
  }

  const config = getConfig();
  const client = getClient();

  console.log('========================================');
  console.log('删除测试环境全部云函数');
  console.log('========================================');
  console.log('环境(命名空间):', envId);
  console.log('========================================\n');

  let totalDeleted = 0;
  let offset = 0;
  const limit = 100;

  for (;;) {
    const res = await client.ListFunctions({
      Namespace: envId,
      Limit: limit,
      Offset: offset,
    });
    const list = res.Functions || [];
    if (list.length === 0) break;

    for (const fn of list) {
      const name = fn.FunctionName || fn.Name;
      if (!name) continue;
      try {
        await client.DeleteFunction({
          FunctionName: name,
          Namespace: envId,
        });
        console.log('✅ 已删除:', name);
        totalDeleted++;
      } catch (err) {
        console.error('❌ 删除失败:', name, err.message);
      }
    }
    if (list.length < limit) break;
    offset += list.length;
  }

  console.log('\n========================================');
  console.log('删除完成，共删除', totalDeleted, '个云函数');
  console.log('请执行: DEPLOY_ENV=test node deploy-all.js 重新部署全部 V201');
  console.log('========================================');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
