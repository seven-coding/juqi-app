// 核心层云函数批量部署脚本
// 部署 getMessagesNew, login, getDynDetail 到测试环境
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const tencentcloud = require('tencentcloud-sdk-nodejs');

// 配置信息
const config = {
  secretId: process.env.TENCENT_SECRET_ID || 'YOUR_SECRET_ID',
  secretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_SECRET_KEY',
  region: 'ap-shanghai',
  envId: 'test-juqi-3g1m5qa7cc2737a1'
};

// 初始化SCF客户端
const ScfClient = tencentcloud.scf.v20180416.Client;
const client = new ScfClient({
  credential: {
    secretId: config.secretId,
    secretKey: config.secretKey,
  },
  region: config.region,
  profile: {
    httpProfile: {
      endpoint: 'scf.tencentcloudapi.com'
    }
  }
});

/**
 * 创建代码包ZIP（包含 node_modules）
 */
function createZip(functionPath, functionName) {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(functionPath, 'deploy.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`  代码包已创建: ${zipPath} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // 添加所有文件（包括 node_modules，排除 .git 和临时文件）
    archive.glob('**/*', {
      cwd: functionPath,
      ignore: ['.git/**', 'deploy.zip', '*.log', '.DS_Store', '**/.DS_Store']
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
 */
async function deployFunction(functionName, functionPath, handler = 'index.main', runtime = 'Nodejs16.13') {
  try {
    console.log(`\n📦 开始部署云函数: ${functionName}`);
    console.log(`   路径: ${functionPath}`);

    // 检查 node_modules 是否存在
    const nodeModulesPath = path.join(functionPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log(`   ⚠️  node_modules 不存在，正在安装依赖...`);
      const { execSync } = require('child_process');
      execSync('npm install', { cwd: functionPath, stdio: 'inherit' });
    }

    // 创建ZIP包
    const zipPath = await createZip(functionPath, functionName);
    const zipBase64 = readZipAsBase64(zipPath);

    // 尝试更新函数代码
    try {
      const updateResult = await client.UpdateFunctionCode({
        FunctionName: functionName,
        ZipFile: zipBase64,
        Handler: handler,
        Namespace: config.envId
      });
      console.log(`   ✅ 函数 ${functionName} 更新成功`);
      if (updateResult.CodeSha256) {
        console.log(`      版本: ${updateResult.CodeSha256.substring(0, 16)}...`);
      }
    } catch (updateErr) {
      if (updateErr.code === 'ResourceNotFound.Function') {
        // 函数不存在，尝试创建
        console.log(`   函数不存在，尝试创建新函数...`);
        const createResult = await client.CreateFunction({
          FunctionName: functionName,
          Code: {
            ZipFile: zipBase64
          },
          Handler: handler,
          Runtime: runtime,
          Timeout: 60,
          MemorySize: 256,
          Namespace: config.envId,
          Environment: {
            Variables: [
              {
                Key: 'TCB_ENV_ID',
                Value: config.envId
              }
            ]
          }
        });
        console.log(`   ✅ 函数 ${functionName} 创建成功`);
      } else {
        throw updateErr;
      }
    }

    // 清理临时文件
    fs.unlinkSync(zipPath);
    console.log(`   ✅ 部署完成: ${functionName}`);

  } catch (err) {
    console.error(`   ❌ 部署失败: ${functionName}`);
    console.error(`      错误: ${err.message}`);
    if (err.code) {
      console.error(`      错误码: ${err.code}`);
    }
    throw err;
  }
}

/**
 * 主函数
 */
async function main() {
  // 需要部署的核心层云函数
  const coreFunctions = [
    {
      name: 'getMessagesNew',
      path: path.join(__dirname, 'getMessagesNew'),
      handler: 'index.main',
      runtime: 'Nodejs16.13'
    },
    {
      name: 'login',
      path: path.join(__dirname, 'login'),
      handler: 'index.main',
      runtime: 'Nodejs16.13'
    },
    {
      name: 'getDynDetail',
      path: path.join(__dirname, 'getDynDetail'),
      handler: 'index.main',
      runtime: 'Nodejs16.13'
    }
  ];

  console.log('========================================');
  console.log('🚀 核心层云函数批量部署工具');
  console.log('========================================');
  console.log(`环境ID: ${config.envId}`);
  console.log(`区域: ${config.region}`);
  console.log(`待部署函数: ${coreFunctions.map(f => f.name).join(', ')}`);
  console.log('========================================');

  let successCount = 0;
  let failCount = 0;

  for (const func of coreFunctions) {
    try {
      // 检查函数目录是否存在
      if (!fs.existsSync(func.path)) {
        console.log(`\n⚠️  跳过 ${func.name}: 目录不存在 (${func.path})`);
        failCount++;
        continue;
      }
      await deployFunction(func.name, func.path, func.handler, func.runtime);
      successCount++;
    } catch (err) {
      console.error(`部署 ${func.name} 失败，继续部署其他函数...`);
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log(`📊 部署结果: 成功 ${successCount} 个, 失败 ${failCount} 个`);
  console.log('========================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

// 运行部署
if (require.main === module) {
  main().catch(err => {
    console.error('部署过程出错:', err);
    process.exit(1);
  });
}

module.exports = { deployFunction, main };
