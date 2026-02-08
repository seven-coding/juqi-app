// 消息模块测试
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
 * 测试1: appGetMessageList - 获取消息列表
 */
async function testGetMessageList() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetMessageList', {
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.messages) {
    throw new Error('缺少messages字段');
  }
  
  if (!Array.isArray(result.data.messages)) {
    throw new Error('messages不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.messages.length}条消息`);
}

/**
 * 测试2: appGetMessageList - 按类型筛选
 */
async function testGetMessageListByType() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetMessageList', {
    type: 1,
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.messages)) {
    throw new Error('messages不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.messages.length}条类型1的消息`);
}

/**
 * 测试3: appSetMessage - 设置消息状态（标记已读）
 */
async function testSetMessageRead() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 先获取消息列表，取第一条进行测试
  const listResult = await callAppApi('appGetMessageList', {
    page: 1,
    limit: 1
  }, TEST_CONFIG.testToken);
  
  if (listResult.code !== 200 || !listResult.data.messages || listResult.data.messages.length === 0) {
    console.log('  [跳过] 没有消息数据，跳过设置状态测试');
    return;
  }
  
  const message = listResult.data.messages[0];
  const mesTypeId = message._id || message.id;
  const mesType = message.type || 1;
  
  const result = await callAppApi('appSetMessage', {
    mesTypeId: mesTypeId,
    mesType: mesType,
    status: 1
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  console.log('  [信息] 消息标记为已读成功');
}

/**
 * 测试4: appSetMessage - 缺少参数
 */
async function testSetMessageMissingParams() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appSetMessage', {
    mesTypeId: 'test_id'
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '必需参数');
}

/**
 * 测试5: appGetUnreadCount - 获取未读消息数
 */
async function testGetUnreadCount() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetUnreadCount', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!result.data.notReadCount) {
    throw new Error('缺少notReadCount字段');
  }
  
  console.log('  [信息] 未读消息数:', JSON.stringify(result.data.notReadCount));
}

/**
 * 测试6: appMarkMessagesRead - 批量标记已读
 */
async function testMarkMessagesRead() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 先获取消息列表
  const listResult = await callAppApi('appGetMessageList', {
    page: 1,
    limit: 5
  }, TEST_CONFIG.testToken);
  
  if (listResult.code !== 200 || !listResult.data.messages || listResult.data.messages.length === 0) {
    console.log('  [跳过] 没有消息数据，跳过批量标记测试');
    return;
  }
  
  const messageIds = listResult.data.messages.slice(0, 3).map(msg => msg._id || msg.id);
  const mesType = listResult.data.messages[0].type || 1;
  
  const result = await callAppApi('appMarkMessagesRead', {
    messageIds: messageIds,
    mesType: mesType
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (result.data.successCount === undefined) {
    throw new Error('缺少successCount字段');
  }
  
  console.log(`  [信息] 批量标记成功: ${result.data.successCount}条`);
}

/**
 * 测试7: appMarkMessagesRead - 缺少参数
 */
async function testMarkMessagesReadMissingParams() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appMarkMessagesRead', {
    messageIds: ['test_id']
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '消息类型');
}

/**
 * 运行所有消息模块测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('消息模块测试');
  
  if (!TEST_CONFIG.testToken) {
    console.log('\n[警告] 缺少token，请先运行认证模块测试');
    const summary = endTestSuite();
    return summary;
  }
  
  await runTest('1. appGetMessageList - 获取消息列表', testGetMessageList);
  await runTest('2. appGetMessageList - 按类型筛选', testGetMessageListByType);
  await runTest('3. appSetMessage - 设置消息状态（标记已读）', testSetMessageRead);
  await runTest('4. appSetMessage - 缺少参数', testSetMessageMissingParams);
  await runTest('5. appGetUnreadCount - 获取未读消息数', testGetUnreadCount);
  await runTest('6. appMarkMessagesRead - 批量标记已读', testMarkMessagesRead);
  await runTest('7. appMarkMessagesRead - 缺少参数', testMarkMessagesReadMissingParams);
  
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
