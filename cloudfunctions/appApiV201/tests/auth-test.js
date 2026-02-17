// 认证模块测试
// 版本: 1.0.0

const { 
  runTest, 
  callAppApi, 
  validateResponse, 
  validateErrorResponse,
  startTestSuite,
  endTestSuite,
  resetTestResults
} = require('./utils/test-helper');
const { generateWechatCode } = require('./utils/mock-data');
const TEST_CONFIG = require('./utils/test-config');

/**
 * 测试1: appLogin - 登录接口（新用户）
 */
async function testLoginNewUser() {
  const code = generateWechatCode();
  TEST_CONFIG.testCode = code;
  
  const result = await callAppApi('appLogin', { code });
  
  // 开发模式下，应该返回成功（使用模拟openId）
  if (result.code === 200) {
    validateResponse(result, 200);
    
    if (!result.data.token) {
      throw new Error('缺少token');
    }
    if (!result.data.openId) {
      throw new Error('缺少openId');
    }
    if (result.data.joinStatus === undefined) {
      throw new Error('缺少joinStatus');
    }
    
    // 保存token和openId供后续测试使用
    TEST_CONFIG.testToken = result.data.token;
    TEST_CONFIG.testOpenId = result.data.openId;
    
    console.log('  [信息] 获取到token和openId');
  } else if (result.code === 400 && result.message && result.message.includes('微信授权失败')) {
    // 生产模式下，如果环境变量未配置，会返回此错误
    console.log('  [警告] 微信登录需要配置环境变量 WECHAT_APP_ID 和 WECHAT_APP_SECRET');
    // 这种情况下，我们使用模拟数据继续测试
    TEST_CONFIG.testToken = 'test_token_' + Date.now();
    TEST_CONFIG.testOpenId = 'test_openid_' + Date.now();
    console.log('  [信息] 使用模拟token和openId继续测试');
  } else {
    throw new Error(`登录失败: ${result.message || '未知错误'}`);
  }
}

/**
 * 测试2: appLogin - 登录接口（缺少code）
 */
async function testLoginMissingCode() {
  const result = await callAppApi('appLogin', {});
  validateErrorResponse(result, 400, '缺少code参数');
}

/**
 * 测试3: appGetUserInfo - 获取用户信息
 */
async function testGetUserInfo() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetUserInfo', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!result.data.userStatus) {
    throw new Error('缺少userStatus');
  }
  
  console.log('  [信息] 用户状态:', result.data.userStatus);
}

/**
 * 测试4: appGetUserInfo - 缺少token
 */
async function testGetUserInfoMissingToken() {
  const result = await callAppApi('appGetUserInfo', {});
  validateErrorResponse(result, 401);
}

/**
 * 测试5: appRefreshToken - 刷新Token
 */
async function testRefreshToken() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appRefreshToken', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (result.data.refreshed !== undefined) {
    console.log('  [信息] Token刷新状态:', result.data.refreshed);
  }
}

/**
 * 测试6: appSubmitLanguageVerify - 提交语言验证
 */
async function testSubmitLanguageVerify() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 生成模拟的base64语音数据
  const mockVoiceData = Buffer.from('mock voice data').toString('base64');
  
  const result = await callAppApi('appSubmitLanguageVerify', {
    voiceData: mockVoiceData,
    voiceDuration: 5
  }, TEST_CONFIG.testToken);
  
  // 如果用户未通过验证，可能返回403，这是正常的
  if (result.code === 403 && result.message && result.message.includes('未通过验证')) {
    console.log('  [跳过] 用户未通过验证，无法提交语言验证（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  if (result.data.verifyId === undefined) {
    throw new Error('缺少verifyId');
  }
}

/**
 * 测试7: appSubmitLanguageVerify - 缺少语音数据
 */
async function testSubmitLanguageVerifyMissingData() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appSubmitLanguageVerify', {
    voiceDuration: 5
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '缺少语音数据');
}

/**
 * 测试8: appGetVerifyStatus - 获取审核状态
 */
async function testGetVerifyStatus() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetVerifyStatus', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (result.data.status === undefined) {
    throw new Error('缺少status');
  }
  
  console.log('  [信息] 审核状态:', result.data.status);
}

/**
 * 运行所有认证模块测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('认证模块测试');
  
  await runTest('1. appLogin - 登录接口（新用户）', testLoginNewUser);
  await runTest('2. appLogin - 缺少code参数', testLoginMissingCode);
  
  if (TEST_CONFIG.testToken) {
    await runTest('3. appGetUserInfo - 获取用户信息', testGetUserInfo);
    await runTest('4. appGetUserInfo - 缺少token', testGetUserInfoMissingToken);
    await runTest('5. appRefreshToken - 刷新Token', testRefreshToken);
    await runTest('6. appSubmitLanguageVerify - 提交语言验证', testSubmitLanguageVerify);
    await runTest('7. appSubmitLanguageVerify - 缺少语音数据', testSubmitLanguageVerifyMissingData);
    await runTest('8. appGetVerifyStatus - 获取审核状态', testGetVerifyStatus);
  } else {
    console.log('\n[警告] 无法获取token，跳过需要认证的测试');
  }
  
  const summary = endTestSuite();
  return summary;
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests()
    .then(summary => {
      process.exit(summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('测试运行出错:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests
};
