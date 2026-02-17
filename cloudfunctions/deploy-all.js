/**
 * 批量部署 JUQI-APP 云函数（读取 cloudbaserc.json 或测试环境 cloudbaserc.test.json）
 * 使用方式:
 *   node deploy-all.js              # 正式环境（cloudbaserc.json，部署 xxxV201）
 *   DEPLOY_ENV=test node deploy-all.js   # 测试环境（cloudbaserc.test.json，部署为 xxxV201）
 * 依赖: 需先 cd 到 cloudfunctions 且 appApiV201 已安装 archiver、tencentcloud-sdk-nodejs
 * 密钥: 在 cloudfunctions/.env 或 apiServer/.env 中配置 TENCENT_SECRET_ID、TENCENT_SECRET_KEY（或 CLOUD_BASE_ID、CLOUD_BASE_KEY）
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const rootDir = __dirname;

/** 加载 .env 并兼容 apiServer 的 CLOUD_BASE_* 命名，必须在 require('./appApiV201/deploy.js') 之前调用。按顺序加载所有存在的 .env，后面的覆盖前面的，确保 apiServer/.env 的密钥生效。 */
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
const isTestEnv = process.env.DEPLOY_ENV === 'test';
const cloudbasercPath = path.join(
  rootDir,
  isTestEnv ? 'cloudbaserc.test.json' : 'cloudbaserc.json'
);

if (!fs.existsSync(cloudbasercPath)) {
  console.error('未找到', cloudbasercPath);
  process.exit(1);
}

const cloudbaserc = JSON.parse(fs.readFileSync(cloudbasercPath, 'utf8'));
let functions = cloudbaserc.functions || [];
const deployOnly = process.env.DEPLOY_ONLY ? process.env.DEPLOY_ONLY.split(',').map(s => s.trim()).filter(Boolean) : null;
if (deployOnly && deployOnly.length > 0) {
  functions = functions.filter(fn => deployOnly.includes(fn.name));
  console.log('按需部署，仅更新:', deployOnly.join(', '));
}

/** 部署名 -> 本地目录名（与 cloudfunctions 下目录一致：均为 xxxV201 则直接使用部署名） */
function deployNameToDir(deployName) {
  return deployName;
}

/** 根据 cloudbaserc 的 functions 列表构建：本地目录名 -> 部署名 */
function buildDirToDeployName(fnList) {
  const map = {};
  for (const fn of fnList || []) {
    map[deployNameToDir(fn.name)] = fn.name;
  }
  return map;
}

/**
 * 通过 git 检测有改动的云函数目录，返回对应的部署名列表。
 * 仅统计 cloudfunctions 下第一级子目录（每个目录对应一个云函数）。
 * @param {string} cloudfunctionsRoot - cloudfunctions 目录绝对路径
 * @param {object} dirToDeployName - 目录名 -> 部署名 映射
 * @returns {string[]|null} 部署名数组；若无法检测（非 git 或出错）返回 null
 */
function getChangedDeployNames(cloudfunctionsRoot, dirToDeployName) {
  try {
    const gitRoot = path.join(cloudfunctionsRoot, '..');
    if (!fs.existsSync(path.join(gitRoot, '.git'))) return null;
    const rel = path.relative(gitRoot, cloudfunctionsRoot).replace(/\\/g, '/') || '.';
    const prefix = rel === '.' ? '' : rel + '/';
    let out = '';
    try {
      out += execSync(`git diff --name-only HEAD -- "${prefix || '.'}" 2>/dev/null || true`, { cwd: gitRoot, encoding: 'utf8' });
      out += execSync(`git diff --name-only --cached -- "${prefix || '.'}" 2>/dev/null || true`, { cwd: gitRoot, encoding: 'utf8' });
    } catch (_) {
      return null;
    }
    const files = out.split('\n').map(s => s.trim()).filter(Boolean);
    const dirs = new Set();
    for (const f of files) {
      const normalized = f.replace(/\\/g, '/');
      const withoutPrefix = prefix ? normalized.replace(prefix, '') : normalized;
      const first = withoutPrefix.split('/')[0];
      if (first && dirToDeployName[first]) dirs.add(dirToDeployName[first]);
    }
    return Array.from(dirs);
  } catch (e) {
    return null;
  }
}

const { deployFunction } = require('./appApiV201/deploy.js');

async function main() {
  console.log('========================================');
  console.log('JUQI-APP 云函数批量部署');
  console.log('========================================');
  console.log(`环境: ${cloudbaserc.envId}${isTestEnv ? ' (测试环境 V201)' : ' (V201)'}`);
  console.log(`函数数量: ${functions.length}`);
  console.log('========================================\n');

  for (const fn of functions) {
    const name = fn.name;
    const sourceDir = deployNameToDir(name);
    const functionPath = path.join(rootDir, sourceDir);
    if (!fs.existsSync(functionPath)) {
      console.log(`⏭ 跳过 ${name}（目录 ${sourceDir} 不存在）`);
      continue;
    }
    const hasPackage = fs.existsSync(path.join(functionPath, 'package.json'));
    if (hasPackage) {
      try {
        console.log(`📦 [${sourceDir}] npm install...`);
        execSync('npm install', { cwd: functionPath, stdio: 'inherit' });
      } catch (e) {
        console.warn(`⚠ [${sourceDir}] npm install 失败，继续部署`);
      }
    }
    try {
      await deployFunction(
        name,
        functionPath,
        fn.handler || 'index.main',
        fn.runtime || 'Nodejs16.13',
        { timeout: fn.timeout, memorySize: fn.memorySize, envId: cloudbaserc.envId }
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

module.exports = {
  main,
  getChangedDeployNames,
  buildDirToDeployName,
  deployNameToDir,
};
