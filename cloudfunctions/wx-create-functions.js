/**
 * 补建云函数（两种方式，任选其一）：
 * 1. 腾讯云 CloudBase Manager（推荐）：仅需 TENCENT_SECRET_ID、TENCENT_SECRET_KEY（或 apiServer 的 CLOUD_BASE_ID、CLOUD_BASE_KEY），
 *    无需小程序 AppID，与测试环境其它云函数创建方式一致。
 * 2. 微信 Open API：需 WX_APPID、WX_SECRET（或 ACCESS_TOKEN）。
 * envId 从 cloudbaserc.json 读取。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const rootDir = path.resolve(__dirname);
const cloudbasercPath = path.join(rootDir, 'cloudbaserc.json');

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
  if (!process.env.TENCENT_SECRET_ID && process.env.CLOUD_BASE_ID) {
    process.env.TENCENT_SECRET_ID = process.env.CLOUD_BASE_ID;
  }
  if (!process.env.TENCENT_SECRET_KEY && process.env.CLOUD_BASE_KEY) {
    process.env.TENCENT_SECRET_KEY = process.env.CLOUD_BASE_KEY;
  }
}

function readCloudbaserc() {
  if (!fs.existsSync(cloudbasercPath)) {
    throw new Error('未找到 cloudbaserc.json');
  }
  return JSON.parse(fs.readFileSync(cloudbasercPath, 'utf8'));
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(chunks));
          } catch (e) {
            resolve({ errcode: -1, errmsg: chunks || 'parse error' });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(chunks));
          } catch (e) {
            resolve({ errcode: -1, errmsg: chunks || 'parse error' });
          }
        });
      })
      .on('error', reject);
  });
}

async function getAccessToken(appId, secret) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`;
  const res = await httpsGet(url);
  if (res.access_token) return res.access_token;
  throw new Error(res.errmsg || '获取 access_token 失败: ' + JSON.stringify(res));
}

async function getFunctionList(accessToken, envId) {
  const url = `https://api.weixin.qq.com/tcb/listfunctions?access_token=${encodeURIComponent(accessToken)}`;
  const res = await httpsPost(url, { env: envId, limit: 100, offset: 0 });
  if (res.errcode !== 0 && res.errcode !== undefined) {
    return null;
  }
  const names = (res.functions || []).map((f) => f.name);
  return new Set(names);
}

async function createFunction(accessToken, envId, functionName) {
  const url = `https://api.weixin.qq.com/tcb/createfunction?access_token=${encodeURIComponent(accessToken)}`;
  return httpsPost(url, { env: envId, function_name: functionName });
}

async function createViaCloudBase(envId, functionList) {
  let CloudBase;
  try {
    CloudBase = require('@cloudbase/manager-node');
  } catch (e) {
    console.error('请先在 cloudfunctions 目录执行: npm install');
    throw e;
  }
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const manager = new CloudBase({ secretId, secretKey, envId });
  const { functions: tcbFunctions } = manager;
  let existingNames = new Set();
  try {
    const res = await tcbFunctions.getFunctionList(100, 0);
    (res.Functions || []).forEach((f) => existingNames.add(f.FunctionName));
  } catch (e) {
    console.warn('获取云函数列表失败，将尝试为所有函数执行创建:', e.message);
  }
  let created = 0;
  let skipped = 0;
  let failed = 0;
  for (const item of functionList) {
    const name = typeof item === 'string' ? item : item.name;
    const config = typeof item === 'string' ? {} : item;
    if (existingNames.has(name)) {
      console.log('⏭ 已存在:', name);
      skipped++;
      continue;
    }
    const functionPath = path.join(rootDir, name);
    if (!fs.existsSync(functionPath)) {
      console.log('⏭ 跳过（目录不存在）:', name);
      skipped++;
      continue;
    }
    try {
      await tcbFunctions.createFunction({
        func: {
          name,
          runtime: config.runtime || 'Nodejs16.13',
          handler: config.handler || 'index.main',
          timeout: config.timeout || 30,
          installDependency: config.installDependency !== false,
        },
        functionPath,
        force: false,
      });
      console.log('✅ 已创建（含代码）:', name);
      created++;
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes('already exist') || msg.includes('ResourceInUse')) {
        console.log('⏭ 已存在:', name);
        skipped++;
      } else {
        console.error('❌ 创建失败:', name, msg);
        failed++;
      }
    }
  }
  return { created, skipped, failed };
}

async function main() {
  loadEnv();
  const cloudbaserc = readCloudbaserc();
  const envId = cloudbaserc.envId;
  const functionList = (cloudbaserc.functions || []).map((f) => (typeof f === 'string' ? f : f));
  const functionNames = functionList.map((f) => (typeof f === 'string' ? f : f.name)).filter(Boolean);

  if (!envId || !functionNames.length) {
    console.error('cloudbaserc.json 中缺少 envId 或 functions 列表');
    process.exit(1);
  }

  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const appId = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;
  const accessToken = process.env.ACCESS_TOKEN;

  if (secretId && secretKey) {
    console.log('使用腾讯云 CloudBase 补建（无需小程序 AppID）');
    console.log('环境:', envId);
    const result = await createViaCloudBase(envId, functionList);
    console.log('\n补建完成: 创建', result.created, '跳过', result.skipped, '失败', result.failed);
    return result;
  }

  if (!accessToken && (!appId || !secret)) {
    console.error('请配置环境变量（任选其一）：');
    console.error('  方式一（推荐）：TENCENT_SECRET_ID + TENCENT_SECRET_KEY（或 apiServer/.env 中的 CLOUD_BASE_ID、CLOUD_BASE_KEY），无需小程序 AppID');
    console.error('  方式二：WX_APPID + WX_SECRET（与云开发关联的小程序）');
    console.error('  方式三：ACCESS_TOKEN');
    process.exit(1);
  }

  let token = accessToken;
  if (!token) {
    console.log('正在获取 access_token...');
    token = await getAccessToken(appId, secret);
  }
  let existingNames = null;
  try {
    existingNames = await getFunctionList(token, envId);
  } catch (e) {
    console.warn('获取云函数列表失败，将尝试为所有函数执行创建:', e.message);
  }
  console.log('环境:', envId);
  let created = 0, skipped = 0, failed = 0;
  for (const name of functionNames) {
    if (existingNames && existingNames.has(name)) {
      console.log('⏭ 已存在:', name);
      skipped++;
      continue;
    }
    const res = await createFunction(token, envId, name);
    if (res.errcode === 0) {
      console.log('✅ 已创建:', name);
      created++;
    } else {
      if (res.errcode === -1 && (res.errmsg || '').includes('already exist')) {
        console.log('⏭ 已存在:', name);
        skipped++;
      } else {
        console.error('❌ 创建失败:', name, res.errcode, res.errmsg);
        failed++;
      }
    }
  }
  console.log('\n补建完成: 创建', created, '跳过', skipped, '失败', failed);
  return { created, skipped, failed };
}

if (require.main === module) {
  main()
    .then((r) => process.exit(r.failed > 0 ? 1 : 0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { main, getAccessToken, getFunctionList, createFunction };
