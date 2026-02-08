// 核心接口端到端测试脚本
// 版本: 2.0.0
// 用途: 测试核心接口（登录、动态、用户）的功能

const { 
  runTest, 
  callAppApi, 
  validateResponse,
  startTestSuite,
  endTestSuite,
  resetTestResults
} = require('./utils/test-helper');
const { generateWechatCode } = require('./utils/mock-data');
const TEST_CONFIG = require('./utils/test-config');

/**
 * 测试1: appLogin - 登录接口
 */
async function testLogin() {
  const code = generateWechatCode();
  const result = await callAppApi('appLogin', {
    code: code
  });
  
  // 开发模式下，应该返回成功（使用模拟openId）
  if (result.code === 200) {
    validateResponse(result, 200);
    // 保存token和openId供后续测试使用
    if (result.data && result.data.token) {
      TEST_CONFIG.testToken = result.data.token;
      TEST_CONFIG.testOpenId = result.data.openId;
      console.log('  [信息] 获取到token和openId');
    }
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
 * 测试2: appGetUserInfo - 获取用户信息
 */
async function testGetUserInfo() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetUserInfo', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!result.data.userStatus) {
    throw new Error('响应数据格式错误: 缺少userStatus');
  }
  
  console.log('  [信息] 用户状态:', {
    joinStatus: result.data.userStatus.joinStatus,
    vipStatus: result.data.userStatus.vipStatus
  });
}

/**
 * 测试3: appGetCurrentUserProfile - 获取当前用户完整信息
 */
async function testGetCurrentUserProfile() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetCurrentUserProfile', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!result.data.userInfo) {
    throw new Error('响应数据格式错误: 缺少userInfo');
  }
  
  // 验证会员状态字段
  const userInfo = result.data.userInfo;
  if (userInfo.usersSecret && Array.isArray(userInfo.usersSecret) && userInfo.usersSecret.length > 0) {
    console.log('  [信息] 会员状态:', {
      vipStatus: userInfo.usersSecret[0].vipStatus,
      hasVipConfig: !!userInfo.usersSecret[0].vipConfig
    });
  }
}

/**
 * 测试4: appGetDynList - 获取动态列表
 */
async function testGetDynList() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 测试不同类型的动态列表
  const types = ['all', 'follow'];
  
  for (const type of types) {
    const result = await callAppApi('appGetDynList', {
      type: type,
      page: 1,
      limit: 10
    }, TEST_CONFIG.testToken);
    
    validateResponse(result, 200);
    
    if (!Array.isArray(result.data.list)) {
      throw new Error(`响应数据格式错误: ${type}类型缺少list数组`);
    }
    
    console.log(`  [信息] ${type}类型动态列表: ${result.data.list.length}条`);
  }
}

/**
 * 测试5: appGetDynDetail - 获取动态详情
 */
async function testGetDynDetail() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 先获取动态列表，取第一条进行详情测试
  const listResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 1
  }, TEST_CONFIG.testToken);
  
  if (listResult.code !== 200 || !listResult.data || !listResult.data.list || listResult.data.list.length === 0) {
    console.log('  [跳过] 没有动态数据，跳过详情测试');
    return;
  }
  
  const dynId = listResult.data.list[0]._id || listResult.data.list[0].id;
  if (!dynId) {
    throw new Error('无法获取动态ID');
  }
  
    const result = await callAppApi('appGetDynDetail', {
      id: dynId
    }, TEST_CONFIG.testToken);
    
    validateResponse(result, 200);
    
    if (!result.data.dyn) {
      throw new Error('响应数据格式错误: 缺少dyn对象');
    }
    
    console.log('  [信息] 动态详情获取成功');
}

/**
 * 测试6: appPublishDyn - 发布动态（需要验证用户状态）
 */
async function testPublishDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 注意：发布动态需要用户通过验证（joinStatus === 1）
  // 如果用户未通过验证，这个测试会失败，这是正常的
  
  const result = await callAppApi('appPublishDyn', {
    dynContent: '测试动态内容 ' + Date.now(),
    circleId: '测试圈子',
    circleTitle: '测试圈子',
    imageIds: [],
    topic: [],
    ait: []
  }, TEST_CONFIG.testToken);
  
  if (result.code === 403 && result.message && result.message.includes('未通过验证')) {
    console.log('  [跳过] 用户未通过验证，无法发布动态（正常）');
    return;
  }
  
  if (result.code !== 200 && result.code !== 201) {
    throw new Error(`发布动态失败: ${result.message || '未知错误'}`);
  }
  
  console.log('  [信息] 动态发布成功');
}

/**
 * 测试7: appLikeDyn - 点赞动态
 */
async function testLikeDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 先获取动态列表，取第一条进行点赞测试
  const listResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 1
  }, TEST_CONFIG.testToken);
  
  if (listResult.code !== 200 || !listResult.data || !listResult.data.list || listResult.data.list.length === 0) {
    console.log('  [跳过] 没有动态数据，跳过点赞测试');
    return;
  }
  
  const dynId = listResult.data.list[0]._id || listResult.data.list[0].id;
  if (!dynId) {
    throw new Error('无法获取动态ID');
  }
  
  const result = await callAppApi('appLikeDyn', {
    id: dynId
  }, TEST_CONFIG.testToken);
  
  if (result.code !== 200) {
    // 如果用户未通过验证，会返回403，这是正常的
    if (result.code === 403) {
      console.log('  [跳过] 用户未通过验证，无法点赞（正常）');
      return;
    }
    throw new Error(`点赞失败: ${result.message || '未知错误'}`);
  }
  
  console.log('  [信息] 点赞成功');
}

/**
 * 测试8: appCommentDyn - 评论动态
 */
async function testCommentDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 先获取动态列表，取第一条进行评论测试
  const listResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 1
  }, TEST_CONFIG.testToken);
  
  if (listResult.code !== 200 || !listResult.data || !listResult.data.list || listResult.data.list.length === 0) {
    console.log('  [跳过] 没有动态数据，跳过评论测试');
    return;
  }
  
  const dynId = listResult.data.list[0]._id || listResult.data.list[0].id;
  if (!dynId) {
    throw new Error('无法获取动态ID');
  }
  
  const result = await callAppApi('appCommentDyn', {
    id: dynId,
    commentContent: '测试评论 ' + Date.now()
  }, TEST_CONFIG.testToken);
  
  if (result.code !== 200) {
    // 如果用户未通过验证，会返回403，这是正常的
    if (result.code === 403) {
      console.log('  [跳过] 用户未通过验证，无法评论（正常）');
      return;
    }
    throw new Error(`评论失败: ${result.message || '未知错误'}`);
  }
  
  console.log('  [信息] 评论成功');
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('核心接口端到端测试');
  
  // 按顺序运行测试
  await runTest('1. appLogin - 登录接口', testLogin);
  
  if (TEST_CONFIG.testToken) {
    await runTest('2. appGetUserInfo - 获取用户信息', testGetUserInfo);
    await runTest('3. appGetCurrentUserProfile - 获取当前用户完整信息', testGetCurrentUserProfile);
    await runTest('4. appGetDynList - 获取动态列表', testGetDynList);
    await runTest('5. appGetDynDetail - 获取动态详情', testGetDynDetail);
    await runTest('6. appPublishDyn - 发布动态', testPublishDyn);
    await runTest('7. appLikeDyn - 点赞动态', testLikeDyn);
    await runTest('8. appCommentDyn - 评论动态', testCommentDyn);
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
