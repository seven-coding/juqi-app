/**
 * 批量部署 JUQI-APP 云函数（读取 cloudbaserc.json）
 * 使用方式: node deploy-all.js
 * 依赖: 需先 cd 到 cloudfunctions 且 appApi 已安装 archiver、tencentcloud-sdk-nodejs
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const cloudbasercPath = path.join(__dirname, 'cloudbaserc.json');
const rootDir = __dirname;

if (!fs.existsSync(cloudbasercPath)) {
  console.error('未找到 cloudbaserc.json');
  process.exit(1);
}

const cloudbaserc = JSON.parse(fs.readFileSync(cloudbasercPath, 'utf8'));
const functions = cloudbaserc.functions || [];
const { deployFunction } = require('./appApi/deploy.js');

async function main() {
  console.log('========================================');
  console.log('JUQI-APP 云函数批量部署');
  console.log('========================================');
  console.log(`环境: ${cloudbaserc.envId}`);
  console.log(`函数数量: ${functions.length}`);
  console.log('========================================\n');

  for (const fn of functions) {
    const name = fn.name;
    const functionPath = path.join(rootDir, name);
    if (!fs.existsSync(functionPath)) {
      console.log(`⏭ 跳过 ${name}（目录不存在）`);
      continue;
    }
    const hasPackage = fs.existsSync(path.join(functionPath, 'package.json'));
    if (hasPackage) {
      try {
        console.log(`📦 [${name}] npm install...`);
        execSync('npm install', { cwd: functionPath, stdio: 'inherit' });
      } catch (e) {
        console.warn(`⚠ [${name}] npm install 失败，继续部署`);
      }
    }
    try {
      await deployFunction(
        name,
        functionPath,
        fn.handler || 'index.main',
        fn.runtime || 'Nodejs16.13'
      );
    } catch (err) {
      console.error(`❌ 部署 ${name} 失败:`, err.message);
    }
  }

  console.log('\n========================================');
  console.log('批量部署结束');
  console.log('========================================');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
