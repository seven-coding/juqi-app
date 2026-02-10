/**
 * 一键自动部署：先补建缺失云函数，再批量上传代码到测试环境。
 * 补建与上传均使用腾讯云密钥，无需小程序 AppID（与测试环境其它云函数创建方式一致）。
 *
 * 配置：在 apiServer/.env 或 cloudfunctions/.env 中配置（或 export）：
 *   TENCENT_SECRET_ID、TENCENT_SECRET_KEY（或 apiServer 中的 CLOUD_BASE_ID、CLOUD_BASE_KEY）
 * 脚本会自动加载 apiServer/.env。
 *
 * 使用：在 cloudfunctions 目录下执行
 *   npm install   # 首次需安装 @cloudbase/manager-node、dotenv
 *   node run-full-deploy.js
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
  // 兼容 apiServer 的 .env 命名：CLOUD_BASE_ID/CLOUD_BASE_KEY 作为腾讯云密钥
  if (!process.env.TENCENT_SECRET_ID && process.env.CLOUD_BASE_ID) {
    process.env.TENCENT_SECRET_ID = process.env.CLOUD_BASE_ID;
  }
  if (!process.env.TENCENT_SECRET_KEY && process.env.CLOUD_BASE_KEY) {
    process.env.TENCENT_SECRET_KEY = process.env.CLOUD_BASE_KEY;
  }

  const deployOnly = process.env.DEPLOY_ONLY ? process.env.DEPLOY_ONLY.split(',').map(s => s.trim()).filter(Boolean) : null;

  if (!deployOnly || deployOnly.length === 0) {
    // 步骤 1：全量部署时才补建缺失云函数
    console.log('\n========== 步骤 1/2：补建缺失云函数（微信 Open API） ==========\n');
    const { main: createMain } = require('./wx-create-functions.js');
    const createResult = await createMain();
    if (createResult.failed > 0) {
      console.warn('部分函数补建失败，继续执行部署步骤。');
    }
  } else {
    console.log('\n========== 按需部署（仅更新指定函数，跳过补建） ==========\n');
    console.log('目标函数:', deployOnly.join(', '));
  }

  // 步骤 2：上传代码（全量或按 DEPLOY_ONLY 列表）
  console.log('\n========== 步骤 2/2：上传代码到测试环境（腾讯云 SCF） ==========\n');
  const { main: deployMain } = require('./deploy-all.js');
  await deployMain();

  console.log('\n========== 部署完成 ==========\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
