// 测试辅助函数
// 版本: 1.0.0

const cloud = require('wx-server-sdk');

// 初始化云开发（使用测试环境）
// 支持通过环境变量配置密钥（用于本地运行）
const initOptions = {
  env: process.env.TCB_ENV_ID || 'test-juqi-3g1m5qa7cc2737a1'
};

// 如果提供了密钥，则使用密钥（本地运行需要）
if (process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY) {
  initOptions.secretId = process.env.TENCENT_SECRET_ID;
  initOptions.secretKey = process.env.TENCENT_SECRET_KEY;
  console.log('[测试配置] 使用环境变量中的密钥配置');
} else {
  console.log('[测试配置] 使用默认配置（需要在微信开发者工具或云环境中运行）');
}

cloud.init(initOptions);

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  startTime: null,
  endTime: null
};

/**
 * 运行测试用例
 */
async function runTest(testName, testFn) {
  testResults.total++;
  console.log(`\n[测试] ${testName}...`);
  
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.passed++;
    console.log(`[✓] ${testName} - 通过 (${duration}ms)`);
    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.failed++;
    testResults.errors.push({
      test: testName,
      error: error.message,
      stack: error.stack,
      duration
    });
    console.error(`[✗] ${testName} - 失败: ${error.message} (${duration}ms)`);
    return { success: false, error: error.message, duration };
  }
}

/**
 * 调用appApi云函数
 */
async function callAppApi(operation, data = {}, token = null) {
  const params = {
    operation,
    data,
    source: 'v2'
  };
  
  if (token) {
    params.token = token;
  }
  
  const result = await cloud.callFunction({
    name: 'appApi',
    data: params
  });
  
  return result.result;
}

/**
 * 验证响应格式
 */
function validateResponse(result, expectedCode = 200) {
  if (!result || typeof result !== 'object') {
    throw new Error('响应格式错误: 不是对象');
  }
  
  if (result.code !== expectedCode) {
    throw new Error(`响应码错误: 期望${expectedCode}, 实际${result.code}, 消息: ${result.message || '无'}`);
  }
  
  if (expectedCode === 200 && !result.data) {
    throw new Error('响应格式错误: 成功响应缺少data字段');
  }
  
  return true;
}

/**
 * 验证错误响应
 */
function validateErrorResponse(result, expectedCode, expectedMessage = null) {
  if (!result || typeof result !== 'object') {
    throw new Error('响应格式错误: 不是对象');
  }
  
  if (result.code !== expectedCode) {
    throw new Error(`错误码错误: 期望${expectedCode}, 实际${result.code}`);
  }
  
  if (expectedMessage && !result.message.includes(expectedMessage)) {
    throw new Error(`错误消息不匹配: 期望包含"${expectedMessage}", 实际"${result.message}"`);
  }
  
  return true;
}

/**
 * 验证数据格式
 */
function validateDataFormat(data, schema) {
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in data)) {
      throw new Error(`缺少字段: ${key}`);
    }
    
    const actualType = Array.isArray(data[key]) ? 'array' : typeof data[key];
    const expectedType = type === 'array' ? 'array' : type;
    
    if (actualType !== expectedType) {
      throw new Error(`字段类型错误: ${key}, 期望${expectedType}, 实际${actualType}`);
    }
  }
  
  return true;
}

/**
 * 开始测试套件
 */
function startTestSuite(suiteName) {
  testResults.startTime = Date.now();
  console.log('\n========================================');
  console.log(`测试套件: ${suiteName}`);
  console.log('========================================');
  console.log(`开始时间: ${new Date().toLocaleString()}`);
  console.log(`测试环境: 测试环境 (test-juqi-3g1m5qa7cc2737a1)`);
  console.log('========================================\n');
}

/**
 * 结束测试套件
 */
function endTestSuite() {
  testResults.endTime = Date.now();
  const duration = testResults.endTime - testResults.startTime;
  
  console.log('\n========================================');
  console.log('测试结果摘要');
  console.log('========================================');
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  console.log(`通过率: ${testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(2) : 0}%`);
  console.log(`总耗时: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`);
  
  if (testResults.errors.length > 0) {
    console.log('\n失败详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.test}`);
      console.log(`   错误: ${error.error}`);
      console.log(`   耗时: ${error.duration}ms`);
    });
  }
  
  console.log('========================================\n');
  
  return {
    total: testResults.total,
    passed: testResults.passed,
    failed: testResults.failed,
    duration,
    errors: testResults.errors
  };
}

/**
 * 重置测试结果
 */
function resetTestResults() {
  testResults.total = 0;
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.errors = [];
  testResults.startTime = null;
  testResults.endTime = null;
}

/**
 * 等待指定时间
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成测试数据
 */
function generateTestData() {
  return {
    code: `test_code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: `test_user_${Date.now()}`,
    dynId: `test_dyn_${Date.now()}`,
    circleId: `test_circle_${Date.now()}`,
    topic: `测试话题_${Date.now()}`,
    keyword: `测试关键词_${Date.now()}`
  };
}

module.exports = {
  runTest,
  callAppApi,
  validateResponse,
  validateErrorResponse,
  validateDataFormat,
  startTestSuite,
  endTestSuite,
  resetTestResults,
  sleep,
  generateTestData,
  testResults
};
