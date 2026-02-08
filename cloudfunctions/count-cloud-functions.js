/**
 * 查询云端环境里已创建的云函数数量。
 * 使用与 wx-create-functions.js 相同的环境变量（TENCENT_SECRET_ID/SECRET_KEY 或 WX_APPID/WX_SECRET）。
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
  if (!process.env.TENCENT_SECRET_ID && process.env.CLOUD_BASE_ID) {
    process.env.TENCENT_SECRET_ID = process.env.CLOUD_BASE_ID;
  }
  if (!process.env.TENCENT_SECRET_KEY && process.env.CLOUD_BASE_KEY) {
    process.env.TENCENT_SECRET_KEY = process.env.CLOUD_BASE_KEY;
  }
}

async function getCloudListViaCloudBase(envId) {
  const CloudBase = require('@cloudbase/manager-node');
  const manager = new CloudBase({
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
    envId,
  });
  const res = await manager.functions.getFunctionList(100, 0);
  return new Set((res.Functions || []).map((f) => f.FunctionName));
}

async function main() {
  loadEnv();
  const cloudbaserc = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'cloudbaserc.json'), 'utf8')
  );
  const envId = cloudbaserc.envId;
  const configNames = (cloudbaserc.functions || []).map((f) =>
    typeof f === 'string' ? f : f.name
  );
  const total = configNames.length;

  let cloudNames = null;
  if (process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY) {
    try {
      cloudNames = await getCloudListViaCloudBase(envId);
    } catch (e) {
      console.error('获取云端列表失败（腾讯云）:', e.message);
      process.exit(1);
    }
  } else {
    const { getAccessToken, getFunctionList } = require('./wx-create-functions.js');
    const appId = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    if (!appId || !secret) {
      console.error('请配置 TENCENT_SECRET_ID/SECRET_KEY 或 WX_APPID/WX_SECRET');
      process.exit(1);
    }
    try {
      const token = await getAccessToken(appId, secret);
      cloudNames = await getFunctionList(token, envId);
      if (!cloudNames) {
        console.error('微信 API 返回的云函数列表为空或失败');
        process.exit(1);
      }
    } catch (e) {
      console.error('获取云端列表失败（微信）:', e.message);
      process.exit(1);
    }
  }

  const created = configNames.filter((n) => cloudNames.has(n));
  const missing = configNames.filter((n) => !cloudNames.has(n));

  console.log('环境:', envId);
  console.log('总数量（配置）:', total);
  console.log('云端已创建:', created.length);
  if (missing.length) {
    console.log('云端未创建:', missing.join(', '));
  }
  return { total, createdCount: created.length, created, missing };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
