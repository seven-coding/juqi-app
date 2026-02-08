// 搜索模块测试
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
const TEST_CONFIG = require('./utils/test-config');

/**
 * 测试1: appSearchUser - 搜索用户
 */
async function testSearchUser() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 使用更安全的关键词，避免内容安全检查失败
  const result = await callAppApi('appSearchUser', {
    keyword: '用户',
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 搜索到${result.data.list.length}个用户`);
}

/**
 * 测试2: appSearchUser - 缺少关键词
 */
async function testSearchUserMissingKeyword() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appSearchUser', {
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '搜索关键词');
}

/**
 * 测试3: appSearchDyn - 搜索动态
 */
async function testSearchDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 使用更安全的关键词，避免内容安全检查失败
  const result = await callAppApi('appSearchDyn', {
    keyword: '动态',
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 搜索到${result.data.list.length}条动态`);
}

/**
 * 测试4: appSearchDyn - 缺少关键词
 */
async function testSearchDynMissingKeyword() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appSearchDyn', {
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '搜索关键词');
}

/**
 * 测试5: appSearchTopic - 搜索话题（有关键词）
 */
async function testSearchTopicWithKeyword() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 使用更安全的关键词，避免内容安全检查失败
  const result = await callAppApi('appSearchTopic', {
    keyword: '话题',
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 搜索到${result.data.list.length}个话题`);
}

/**
 * 测试6: appSearchTopic - 获取话题列表（无关键词）
 */
async function testSearchTopicWithoutKeyword() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appSearchTopic', {
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.list.length}个话题`);
}

/**
 * 测试7: appSearchCircle - 搜索圈子
 */
async function testSearchCircle() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 使用更安全的关键词，避免内容安全检查失败
  const result = await callAppApi('appSearchCircle', {
    keyword: '圈子',
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 搜索到${result.data.list.length}个圈子`);
}

/**
 * 测试8: appSearchCircle - 缺少关键词
 */
async function testSearchCircleMissingKeyword() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appSearchCircle', {
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '搜索关键词');
}

/**
 * 运行所有搜索模块测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('搜索模块测试');
  
  if (!TEST_CONFIG.testToken) {
    console.log('\n[警告] 缺少token，请先运行认证模块测试');
    const summary = endTestSuite();
    return summary;
  }
  
  await runTest('1. appSearchUser - 搜索用户', testSearchUser);
  await runTest('2. appSearchUser - 缺少关键词', testSearchUserMissingKeyword);
  await runTest('3. appSearchDyn - 搜索动态', testSearchDyn);
  await runTest('4. appSearchDyn - 缺少关键词', testSearchDynMissingKeyword);
  await runTest('5. appSearchTopic - 搜索话题（有关键词）', testSearchTopicWithKeyword);
  await runTest('6. appSearchTopic - 获取话题列表（无关键词）', testSearchTopicWithoutKeyword);
  await runTest('7. appSearchCircle - 搜索圈子', testSearchCircle);
  await runTest('8. appSearchCircle - 缺少关键词', testSearchCircleMissingKeyword);
  
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
