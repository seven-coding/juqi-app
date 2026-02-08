// 云函数部署脚本
// 使用腾讯云SDK部署云函数
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

// 配置信息
const config = {
  secretId: process.env.TENCENT_SECRET_ID || 'YOUR_SECRET_ID',
  secretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_SECRET_KEY',
  region: 'ap-shanghai',
  envId: 'test-juqi-3g1m5qa7cc2737a1'
};

// 初始化SCF客户端（使用云开发环境）
// 注意：这里使用云开发的函数部署方式
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
 */
async function deployFunction(functionName, functionPath, handler = 'index.main', runtime = 'Nodejs16.13') {
  try {
    console.log(`\n开始部署云函数: ${functionName}`);
    console.log(`路径: ${functionPath}`);

    // 创建ZIP包
    const zipPath = await createZip(functionPath);
    const zipBase64 = readZipAsBase64(zipPath);

    // 检查函数是否存在
    // 注意：云开发环境中的函数可能需要使用不同的命名空间
    let functionExists = false;
    try {
      // 尝试查询函数（可能需要使用环境ID作为命名空间）
      await client.DescribeFunction({
        FunctionName: functionName,
        Namespace: config.envId || 'default'
      });
      functionExists = true;
      console.log(`函数 ${functionName} 已存在，将更新代码...`);
    } catch (err) {
      if (err.code === 'ResourceNotFound.Function' || err.code === 'InvalidParameterValue') {
        console.log(`函数 ${functionName} 不存在或需要创建，将尝试创建/更新...`);
        // 对于云开发环境，可能需要先创建
      } else {
        console.log(`查询函数时出错: ${err.message}，将尝试直接更新...`);
        // 即使查询失败，也尝试更新（可能是权限问题）
        functionExists = true;
      }
    }

    // 尝试更新函数代码
    try {
      const updateResult = await client.UpdateFunctionCode({
        FunctionName: functionName,
        ZipFile: zipBase64,
        Handler: handler,
        Namespace: config.envId || 'default'
      });
      console.log(`✅ 函数 ${functionName} 更新成功`);
      if (updateResult.CodeSha256) {
        console.log(`   版本: ${updateResult.CodeSha256.substring(0, 16)}...`);
      }
    } catch (updateErr) {
      if (updateErr.code === 'ResourceNotFound.Function') {
        // 函数不存在，尝试创建
        console.log(`函数不存在，尝试创建新函数...`);
        try {
          const createResult = await client.CreateFunction({
            FunctionName: functionName,
            Code: {
              ZipFile: zipBase64
            },
            Handler: handler,
            Runtime: runtime,
            Timeout: 60,
            MemorySize: 256,
            Namespace: config.envId || 'default',
            Environment: {
              Variables: [
                {
                  Key: 'TCB_ENV_ID',
                  Value: config.envId
                }
              ]
            }
          });
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
 */
async function main() {
  const functions = [
    {
      name: 'appApi',
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
  console.log(`SecretId: ${config.secretId.substring(0, 10)}...`);
  console.log('========================================\n');

  for (const func of functions) {
    try {
      await deployFunction(func.name, func.path, func.handler, func.runtime);
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

module.exports = { deployFunction, main };
