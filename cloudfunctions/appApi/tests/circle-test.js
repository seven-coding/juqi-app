// 圈子模块测试
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
 * 测试1: appGetCircleList - 获取圈子列表
 */
async function testGetCircleList() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetCircleList', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  // 保存第一个圈子ID供后续测试使用
  if (result.data.list.length > 0) {
    const firstCircle = result.data.list[0];
    // 尝试多种可能的字段名
    TEST_CONFIG.testCircleId = firstCircle.circleId || firstCircle.id || firstCircle._id || firstCircle.circle_id;
    if (TEST_CONFIG.testCircleId) {
      console.log(`  [信息] 获取到${result.data.list.length}个圈子，保存第一个圈子ID: ${TEST_CONFIG.testCircleId}`);
    } else {
      console.log(`  [警告] 圈子数据缺少ID字段，数据结构: ${JSON.stringify(Object.keys(firstCircle))}`);
    }
  } else {
    console.log('  [信息] 圈子列表为空');
  }
}

/**
 * 测试2: appGetCircleDetail - 获取圈子详情
 */
async function testGetCircleDetail() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有圈子ID，先获取一个
  if (!TEST_CONFIG.testCircleId) {
    const listResult = await callAppApi('appGetCircleList', {}, TEST_CONFIG.testToken);
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testCircleId = listResult.data.list[0].circleId || listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有圈子数据，跳过详情测试');
      return;
    }
  }
  
  const result = await callAppApi('appGetCircleDetail', {
    circleId: TEST_CONFIG.testCircleId
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.circle) {
    throw new Error('缺少circle对象');
  }
  
  console.log('  [信息] 圈子详情获取成功');
}

/**
 * 测试3: appGetCircleDetail - 缺少circleId
 */
async function testGetCircleDetailMissingId() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetCircleDetail', {}, TEST_CONFIG.testToken);
  validateErrorResponse(result, 400, '圈子ID');
}

/**
 * 测试4: appJoinCircle - 加入圈子
 */
async function testJoinCircle() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有圈子ID，先获取一个
  if (!TEST_CONFIG.testCircleId) {
    const listResult = await callAppApi('appGetCircleList', {}, TEST_CONFIG.testToken);
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testCircleId = listResult.data.list[0].circleId || listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有圈子数据，跳过加入测试');
      return;
    }
  }
  
  const result = await callAppApi('appJoinCircle', {
    circleId: TEST_CONFIG.testCircleId
  }, TEST_CONFIG.testToken);
  
  // 如果已加入，返回400是正常的
  if (result.code === 400 && result.message && result.message.includes('已加入')) {
    console.log('  [信息] 已加入该圈子（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  console.log('  [信息] 加入圈子成功');
}

/**
 * 测试5: appQuitCircle - 退出圈子
 */
async function testQuitCircle() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  if (!TEST_CONFIG.testCircleId) {
    console.log('  [跳过] 没有圈子ID，跳过退出测试');
    return;
  }
  
  const result = await callAppApi('appQuitCircle', {
    circleId: TEST_CONFIG.testCircleId
  }, TEST_CONFIG.testToken);
  
  // 如果未加入，返回400是正常的
  if (result.code === 400 && result.message && result.message.includes('未加入')) {
    console.log('  [信息] 未加入该圈子（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  console.log('  [信息] 退出圈子成功');
}

/**
 * 测试6: appGetTopicList - 获取话题列表
 */
async function testGetTopicList() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetTopicList', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  // 保存第一个话题供后续测试使用
  if (result.data.list.length > 0) {
    TEST_CONFIG.testTopic = result.data.list[0].topic || result.data.list[0].topicName;
    console.log(`  [信息] 获取到${result.data.list.length}个话题，保存第一个话题: ${TEST_CONFIG.testTopic}`);
  } else {
    console.log('  [信息] 话题列表为空');
  }
}

/**
 * 测试7: appGetTopicDetail - 获取话题详情（通过topicId）
 */
async function testGetTopicDetailById() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有话题，先获取一个
  if (!TEST_CONFIG.testTopic) {
    const listResult = await callAppApi('appGetTopicList', {}, TEST_CONFIG.testToken);
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testTopic = listResult.data.list[0].topic || listResult.data.list[0].topicName;
    } else {
      console.log('  [跳过] 没有话题数据，跳过详情测试');
      return;
    }
  }
  
  const result = await callAppApi('appGetTopicDetail', {
    topic: TEST_CONFIG.testTopic
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.topic) {
    throw new Error('缺少topic对象');
  }
  
  console.log('  [信息] 话题详情获取成功');
}

/**
 * 测试8: appGetTopicDetail - 缺少参数
 */
async function testGetTopicDetailMissingParams() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetTopicDetail', {}, TEST_CONFIG.testToken);
  validateErrorResponse(result, 400, '话题ID或话题名');
}

/**
 * 测试9: appGetTopicDynList - 获取话题动态列表
 */
async function testGetTopicDynList() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有话题，先获取一个
  if (!TEST_CONFIG.testTopic) {
    const listResult = await callAppApi('appGetTopicList', {}, TEST_CONFIG.testToken);
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testTopic = listResult.data.list[0].topic || listResult.data.list[0].topicName;
    } else {
      console.log('  [跳过] 没有话题数据，跳过话题动态测试');
      return;
    }
  }
  
  const result = await callAppApi('appGetTopicDynList', {
    topic: TEST_CONFIG.testTopic,
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.list.length}条话题动态`);
}

/**
 * 测试10: appGetTopicDynList - 缺少topic参数
 */
async function testGetTopicDynListMissingTopic() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetTopicDynList', {
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '话题名');
}

/**
 * 测试11: appCreateTopic - 创建话题
 */
async function testCreateTopic() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const topicName = `测试话题_${Date.now()}`;
  
  const result = await callAppApi('appCreateTopic', {
    topic: topicName
  }, TEST_CONFIG.testToken);
  
  // 如果话题已存在，返回400是正常的
  if (result.code === 400 && result.message && result.message.includes('已存在')) {
    console.log('  [信息] 话题已存在（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  if (!result.data.topic) {
    throw new Error('缺少topic对象');
  }
  
  TEST_CONFIG.testTopic = topicName;
  console.log('  [信息] 话题创建成功');
}

/**
 * 测试12: appCreateTopic - 缺少topic参数
 */
async function testCreateTopicMissingTopic() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appCreateTopic', {}, TEST_CONFIG.testToken);
  validateErrorResponse(result, 400, '话题名称');
}

/**
 * 运行所有圈子模块测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('圈子模块测试');
  
  if (!TEST_CONFIG.testToken) {
    console.log('\n[警告] 缺少token，请先运行认证模块测试');
    const summary = endTestSuite();
    return summary;
  }
  
  await runTest('1. appGetCircleList - 获取圈子列表', testGetCircleList);
  await runTest('2. appGetCircleDetail - 获取圈子详情', testGetCircleDetail);
  await runTest('3. appGetCircleDetail - 缺少circleId', testGetCircleDetailMissingId);
  await runTest('4. appJoinCircle - 加入圈子', testJoinCircle);
  await runTest('5. appQuitCircle - 退出圈子', testQuitCircle);
  await runTest('6. appGetTopicList - 获取话题列表', testGetTopicList);
  await runTest('7. appGetTopicDetail - 获取话题详情', testGetTopicDetailById);
  await runTest('8. appGetTopicDetail - 缺少参数', testGetTopicDetailMissingParams);
  await runTest('9. appGetTopicDynList - 获取话题动态列表', testGetTopicDynList);
  await runTest('10. appGetTopicDynList - 缺少topic参数', testGetTopicDynListMissingTopic);
  await runTest('11. appCreateTopic - 创建话题', testCreateTopic);
  await runTest('12. appCreateTopic - 缺少topic参数', testCreateTopicMissingTopic);
  
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
