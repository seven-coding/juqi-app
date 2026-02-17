// 云函数部署脚本
// 使用腾讯云SDK部署云函数。密钥从环境变量或 .env 读取（支持 CLOUD_BASE_ID/CLOUD_BASE_KEY）
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 检查是否安装了archiver
try {
  require.resolve('archiver');
} catch (e) {
  console.error('请先安装 archiver: npm install archiver');
  process.exit(1);
}

const tencentcloud = require('tencentcloud-sdk-nodejs');

const deployRoot = path.resolve(__dirname, '..');

/** 加载 .env 并兼容 CLOUD_BASE_*。按顺序加载所有存在的 .env，后面的覆盖前面的，确保 apiServer/.env 的密钥生效。 */
function loadEnv() {
  const envPaths = [
    path.join(deployRoot, '.env'),
    path.join(deployRoot, '..', '.env'),
    path.join(deployRoot, '..', 'apiServer', '.env'),
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

/** 获取并校验配置，密钥无效时抛出明确错误 */
function getConfig() {
  loadEnv();
  const secretId = process.env.TENCENT_SECRET_ID || '';
  const secretKey = process.env.TENCENT_SECRET_KEY || '';
  const isPlaceholder = (s) => !s || s === 'YOUR_SECRET_ID' || s === 'YOUR_SECRET_KEY';
  if (isPlaceholder(secretId) || isPlaceholder(secretKey)) {
    throw new Error(
      '未配置腾讯云密钥，无法部署。请在 cloudfunctions 或 apiServer 下创建 .env，设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY（或 CLOUD_BASE_ID、CLOUD_BASE_KEY）。'
    );
  }
  let envId = process.env.TCB_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1';
  const isTest = process.env.DEPLOY_ENV === 'test';
  const rcPath = path.join(deployRoot, isTest ? 'cloudbaserc.test.json' : 'cloudbaserc.json');
  if (fs.existsSync(rcPath)) {
    try {
      const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
      if (rc.envId) envId = rc.envId;
    } catch (e) { /* 忽略 */ }
  }
  return { secretId, secretKey, region: 'ap-shanghai', envId };
}

let _client = null;
function getClient() {
  if (_client) return _client;
  const config = getConfig();
  const ScfClient = tencentcloud.scf.v20180416.Client;
  _client = new ScfClient({
    credential: { secretId: config.secretId, secretKey: config.secretKey },
    region: config.region,
    profile: {
      httpProfile: {
        endpoint: 'scf.tencentcloudapi.com',
        reqTimeout: 120
      }
    }
  });
  return _client;
}

/**
 * 创建代码包ZIP
 */
function createZip(functionPath) {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(functionPath, 'deploy.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`代码包已创建: ${zipPath} (${archive.pointer()} bytes)`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // 添加文件（包含 node_modules，云端需依赖 wx-server-sdk 等；仅排除 .git 与临时文件）
    archive.glob('**/*', {
      cwd: functionPath,
      ignore: ['.git/**', 'deploy.zip', '*.log', '.DS_Store']
    });

    archive.finalize();
  });
}

/**
 * 读取ZIP文件为base64
 */
function readZipAsBase64(zipPath) {
  return fs.readFileSync(zipPath, 'base64');
}

/**
 * 部署云函数
 * @param {string} functionName - 函数名
 * @param {string} functionPath - 本地路径
 * @param {string} [handler='index.main'] - 入口
 * @param {string} [runtime='Nodejs16.13'] - 运行时
 * @param {{ timeout?: number, memorySize?: number, envId?: string }} [options] - 可选：timeout、memorySize、envId（未传时从 cloudbaserc 或默认取）
 */
async function deployFunction(functionName, functionPath, handler = 'index.main', runtime = 'Nodejs16.13', options = {}) {
  const config = getConfig();
  const namespace = options.envId || config.envId || 'default';
  const tcbEnvId = options.envId || config.envId;
  const timeout = options.timeout != null ? options.timeout : 60;
  const memorySize = options.memorySize != null ? options.memorySize : 256;
  const client = getClient();

  try {
    console.log(`\n开始部署云函数: ${functionName}`);
    console.log(`路径: ${functionPath}`);

    // 创建ZIP包
    const zipPath = await createZip(functionPath);
    const zipBase64 = readZipAsBase64(zipPath);

    // 检查函数是否存在（SCF SDK 使用 GetFunction，不是 DescribeFunction）
    let functionExists = false;
    try {
      await client.GetFunction({
        FunctionName: functionName,
        Namespace: namespace
      });
      functionExists = true;
      console.log(`函数 ${functionName} 已存在，将更新代码...`);
    } catch (err) {
      if (err.code === 'ResourceNotFound.Function' || err.code === 'InvalidParameterValue') {
        console.log(`函数 ${functionName} 不存在或需要创建，将尝试创建/更新...`);
      } else {
        console.log(`查询函数时出错: ${err.message}，将尝试直接更新...`);
        functionExists = true;
      }
    }

    // 尝试更新函数代码
    try {
      const updateResult = await client.UpdateFunctionCode({
        FunctionName: functionName,
        ZipFile: zipBase64,
        Handler: handler,
        Namespace: namespace
      });
      console.log(`✅ 函数 ${functionName} 更新成功`);
      if (updateResult.CodeSha256) {
        console.log(`   版本: ${updateResult.CodeSha256.substring(0, 16)}...`);
      }

      // 同步更新超时与内存（避免云端仍为默认 10 秒）；更新代码后函数短暂处于 Updating，需延迟重试
      const updateConfig = () => client.UpdateFunctionConfiguration({
        FunctionName: functionName,
        Namespace: namespace,
        Timeout: timeout,
        MemorySize: memorySize
      });
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            await sleep(8000);
            console.log(`   重试更新配置（${attempt}/3）...`);
          }
          await updateConfig();
          console.log(`   配置已更新: timeout=${timeout}s, memory=${memorySize}MB`);
          break;
        } catch (cfgErr) {
          const isUpdating = (cfgErr.message || '').includes('Updating') || (cfgErr.message || '').includes('请稍后重试');
          if (isUpdating && attempt < 3) continue;
          console.warn(`   更新配置时出错（可忽略）: ${cfgErr.message}`);
          break;
        }
      }
    } catch (updateErr) {
      if (updateErr.code === 'ResourceNotFound.Function') {
        console.log(`函数不存在，尝试创建新函数...`);
        try {
          const createParams = {
            FunctionName: functionName,
            Code: { ZipFile: zipBase64 },
            Handler: handler,
            Runtime: runtime,
            Timeout: timeout,
            MemorySize: memorySize,
            Namespace: namespace,
            Environment: {
              Variables: [{ Key: 'TCB_ENV_ID', Value: tcbEnvId }]
            },
            Role: 'TCB_QcsRole',
            Stamp: 'MINI_QCBASE'
          };
          await client.CreateFunction(createParams);
          console.log(`✅ 函数 ${functionName} 创建成功`);
        } catch (createErr) {
          console.error(`创建函数失败: ${createErr.message}`);
          throw createErr;
        }
      } else {
        throw updateErr;
      }
    }

    // 清理临时文件
    fs.unlinkSync(zipPath);
    console.log(`✅ 部署完成: ${functionName}\n`);

  } catch (err) {
    console.error(`❌ 部署失败: ${functionName}`);
    console.error(`   错误: ${err.message}`);
    if (err.code) {
      console.error(`   错误码: ${err.code}`);
    }
    throw err;
  }
}

/**
 * 主函数
 * 单独运行或通过 deploy-all 部署，统一部署名为 appApiV201
 */
async function main() {
  const config = getConfig();
  const deployName = 'appApiV201';
  const functions = [
    {
      name: deployName,
      path: path.join(__dirname),
      handler: 'index.main',
      runtime: 'Nodejs16.13'
    }
  ];

  console.log('========================================');
  console.log('云函数部署工具');
  console.log('========================================');
  console.log(`环境ID: ${config.envId}`);
  console.log(`区域: ${config.region}`);
  console.log(`SecretId: ${config.secretId.substring(0, Math.min(10, config.secretId.length))}...`);
  console.log('========================================\n');

  for (const func of functions) {
    try {
      await deployFunction(func.name, func.path, func.handler, func.runtime, { envId: config.envId });
    } catch (err) {
      console.error(`部署 ${func.name} 失败，继续部署其他函数...`);
    }
  }

  console.log('\n========================================');
  console.log('部署完成');
  console.log('========================================');
}

// 运行部署
if (require.main === module) {
  main().catch(err => {
    console.error('部署过程出错:', err);
    process.exit(1);
  });
}

module.exports = { deployFunction, main, getConfig, getClient };
