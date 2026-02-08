/**
 * 部署 getDynsListV2 云函数到测试环境
 * 使用方式: node deploy-getDynsListV2.js
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const rootDir = __dirname;
const functionName = 'getDynsListV2';
const functionPath = path.join(rootDir, functionName);

// 加载环境变量
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
  
  // 兼容 apiServer 的 .env 命名
  if (!process.env.TENCENT_SECRET_ID && process.env.CLOUD_BASE_ID) {
    process.env.TENCENT_SECRET_ID = process.env.CLOUD_BASE_ID;
  }
  if (!process.env.TENCENT_SECRET_KEY && process.env.CLOUD_BASE_KEY) {
    process.env.TENCENT_SECRET_KEY = process.env.CLOUD_BASE_KEY;
  }
}

async function main() {
  loadEnv();
  
  console.log('========================================');
  console.log(`部署 ${functionName} 到测试环境`);
  console.log('========================================\n');
  
  if (!fs.existsSync(functionPath)) {
    console.error(`❌ 目录不存在: ${functionPath}`);
    process.exit(1);
  }
  
  // 安装依赖
  const hasPackage = fs.existsSync(path.join(functionPath, 'package.json'));
  if (hasPackage) {
    try {
      console.log(`📦 npm install...`);
      execSync('npm install', { cwd: functionPath, stdio: 'inherit' });
    } catch (e) {
      console.warn(`⚠ npm install 失败，继续部署`);
    }
  }
  
  // 部署
  const { deployFunction } = require('./appApi/deploy.js');
  try {
    await deployFunction(
      functionName,
      functionPath,
      'index.main',
      'Nodejs16.13'
    );
    console.log(`\n✅ ${functionName} 部署成功！`);
  } catch (err) {
    console.error(`❌ 部署失败:`, err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
