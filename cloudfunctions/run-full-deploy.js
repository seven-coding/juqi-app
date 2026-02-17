/**
 * 一键部署（默认最小部署：仅部署有改动的云函数；显式全量时部署全部）。
 * 补建与上传均使用腾讯云密钥，无需小程序 AppID。
 *
 * 配置：在 apiServer/.env 或 cloudfunctions/.env 中配置：
 *   TENCENT_SECRET_ID、TENCENT_SECRET_KEY（或 CLOUD_BASE_ID、CLOUD_BASE_KEY）
 *
 * 使用（在 cloudfunctions 目录下执行）：
 *   node run-full-deploy.js           # 最小部署：仅部署 git 有改动的函数
 *   node run-full-deploy.js full      # 全量部署：补建 + 部署全部（或 DEPLOY_FULL=1）
 *   DEPLOY_ONLY=getDynDetailV201 node run-full-deploy.js   # 仅部署指定函数
 */
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname);

function loadEnv() {
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '..', '.env'),
    path.join(rootDir, '..', 'apiServer', '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      try {
        require('dotenv').config({ path: p });
      } catch (e) {}
    }
  }
}

async function run() {
  loadEnv();
  if (!process.env.TENCENT_SECRET_ID && process.env.CLOUD_BASE_ID) {
    process.env.TENCENT_SECRET_ID = process.env.CLOUD_BASE_ID;
  }
  if (!process.env.TENCENT_SECRET_KEY && process.env.CLOUD_BASE_KEY) {
    process.env.TENCENT_SECRET_KEY = process.env.CLOUD_BASE_KEY;
  }

  // 默认测试环境
  if (!process.env.DEPLOY_ENV) process.env.DEPLOY_ENV = 'test';

  const fullDeploy = process.env.DEPLOY_FULL === '1' || process.env.DEPLOY_FULL === 'true' ||
    (process.argv[2] && ['full', '全量', 'all'].includes(String(process.argv[2]).toLowerCase()));
  let deployOnly = process.env.DEPLOY_ONLY ? process.env.DEPLOY_ONLY.split(',').map(s => s.trim()).filter(Boolean) : null;

  if (!fullDeploy && (!deployOnly || deployOnly.length === 0)) {
    const cloudbasercPath = path.join(rootDir, 'cloudbaserc.test.json');
    if (!fs.existsSync(cloudbasercPath)) {
      console.log('未找到 cloudbaserc.test.json，执行全量部署。');
    } else {
      const cloudbaserc = JSON.parse(fs.readFileSync(cloudbasercPath, 'utf8'));
      const { getChangedDeployNames, buildDirToDeployName } = require('./deploy-all.js');
      const dirToDeployName = buildDirToDeployName(cloudbaserc.functions || []);
      const changed = getChangedDeployNames(rootDir, dirToDeployName);
      if (changed && changed.length > 0) {
        deployOnly = changed;
        console.log('\n========== 最小部署（仅部署有改动的函数） ==========');
        console.log('检测到改动:', deployOnly.join(', '));
      } else {
        console.log('\n未检测到 cloudfunctions 下改动，跳过部署。');
        console.log('全量部署请执行: node run-full-deploy.js full  或  DEPLOY_FULL=1 node run-full-deploy.js\n');
        process.exit(0);
      }
    }
  }

  if (fullDeploy || (!deployOnly || deployOnly.length === 0)) {
    console.log('\n========== 步骤 1/2：补建缺失云函数（微信 Open API） ==========\n');
    const { main: createMain } = require('./wx-create-functions.js');
    const createResult = await createMain();
    if (createResult.failed > 0) console.warn('部分函数补建失败，继续执行部署步骤。');
  } else {
    process.env.DEPLOY_ONLY = deployOnly.join(',');
    console.log('\n========== 按需部署（跳过补建） ==========\n');
    console.log('目标函数:', deployOnly.join(', '));
  }

  console.log('\n========== 步骤 2/2：上传代码到测试环境（腾讯云 SCF） ==========\n');
  const { main: deployMain } = require('./deploy-all.js');
  await deployMain();

  console.log('\n========== 部署完成 ==========\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
