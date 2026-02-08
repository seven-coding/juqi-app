// 数据格式测试
// 版本: 1.0.0

const { 
  runTest, 
  callAppApi, 
  validateResponse,
  startTestSuite,
  endTestSuite,
  resetTestResults
} = require('./utils/test-helper');
const TEST_CONFIG = require('./utils/test-config');

/**
 * 验证动态数据格式
 */
function validatePostFormat(post) {
  const errors = [];
  
  // 必需字段
  if (!post.id && !post._id) {
    errors.push('缺少id字段');
  }
  if (!post.userId) {
    errors.push('缺少userId字段');
  }
  if (!post.userName) {
    errors.push('缺少userName字段');
  }
  if (post.isVip === undefined) {
    errors.push('缺少isVip字段');
  }
  if (!post.content) {
    errors.push('缺少content字段');
  }
  if (!post.publishTime) {
    errors.push('缺少publishTime字段');
  }
  if (post.commentCount === undefined) {
    errors.push('缺少commentCount字段');
  }
  if (post.likeCount === undefined) {
    errors.push('缺少likeCount字段');
  }
  if (post.shareCount === undefined) {
    errors.push('缺少shareCount字段');
  }
  if (post.chargeCount === undefined) {
    errors.push('缺少chargeCount字段');
  }
  if (post.isLiked === undefined) {
    errors.push('缺少isLiked字段');
  }
  if (post.isCollected === undefined) {
    errors.push('缺少isCollected字段');
  }
  if (post.isCharged === undefined) {
    errors.push('缺少isCharged字段');
  }
  
  // 字段类型验证
  if (post.images !== null && !Array.isArray(post.images)) {
    errors.push('images字段类型错误，应该是数组或null');
  }
  if (post.publishTime && !(post.publishTime instanceof Date) && typeof post.publishTime !== 'number' && typeof post.publishTime !== 'string') {
    errors.push('publishTime字段类型错误');
  }
  if (typeof post.isVip !== 'boolean') {
    errors.push('isVip字段类型错误，应该是布尔值');
  }
  if (typeof post.isLiked !== 'boolean') {
    errors.push('isLiked字段类型错误，应该是布尔值');
  }
  
  if (errors.length > 0) {
    throw new Error('动态数据格式错误:\n  - ' + errors.join('\n  - '));
  }
  
  return true;
}

/**
 * 验证评论数据格式
 */
function validateCommentFormat(comment) {
  const errors = [];
  
  // 必需字段
  if (!comment.id && !comment._id) {
    errors.push('缺少id字段');
  }
  if (!comment.postId) {
    errors.push('缺少postId字段');
  }
  if (!comment.userId) {
    errors.push('缺少userId字段');
  }
  if (!comment.userName) {
    errors.push('缺少userName字段');
  }
  if (!comment.content) {
    errors.push('缺少content字段');
  }
  if (!comment.publishTime) {
    errors.push('缺少publishTime字段');
  }
  if (comment.likeCount === undefined) {
    errors.push('缺少likeCount字段');
  }
  if (comment.isLiked === undefined) {
    errors.push('缺少isLiked字段');
  }
  
  // 字段类型验证
  if (comment.replies !== null && !Array.isArray(comment.replies)) {
    errors.push('replies字段类型错误，应该是数组或null');
  }
  if (comment.mentionedUsers !== null && !Array.isArray(comment.mentionedUsers)) {
    errors.push('mentionedUsers字段类型错误，应该是数组或null');
  }
  if (typeof comment.isLiked !== 'boolean') {
    errors.push('isLiked字段类型错误，应该是布尔值');
  }
  
  if (errors.length > 0) {
    throw new Error('评论数据格式错误:\n  - ' + errors.join('\n  - '));
  }
  
  return true;
}

/**
 * 验证用户数据格式
 */
function validateUserFormat(user) {
  const errors = [];
  
  // 必需字段
  if (!user.id && !user._id) {
    errors.push('缺少id字段');
  }
  if (!user.userName && !user.nickName) {
    errors.push('缺少userName/nickName字段');
  }
  if (user.isVip === undefined && (!user.usersSecret || !user.usersSecret[0] || user.usersSecret[0].vipStatus === undefined)) {
    errors.push('缺少isVip或usersSecret字段');
  }
  
  // 字段类型验证
  if (user.followStatus !== undefined && typeof user.followStatus !== 'number') {
    errors.push('followStatus字段类型错误，应该是数字');
  }
  if (user.blackStatus !== undefined && typeof user.blackStatus !== 'number') {
    errors.push('blackStatus字段类型错误，应该是数字');
  }
  
  if (errors.length > 0) {
    throw new Error('用户数据格式错误:\n  - ' + errors.join('\n  - '));
  }
  
  return true;
}

/**
 * 测试1: 动态列表数据格式
 */
async function testDynListFormat() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 5
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  // 验证每条动态的格式
  for (let i = 0; i < result.data.list.length; i++) {
    const post = result.data.list[i];
    try {
      validatePostFormat(post);
      console.log(`  [信息] 动态${i + 1}格式正确`);
    } catch (error) {
      throw new Error(`动态${i + 1}格式错误: ${error.message}`);
    }
  }
  
  console.log(`  [信息] 验证了${result.data.list.length}条动态的格式`);
}

/**
 * 测试2: 动态详情数据格式
 */
async function testDynDetailFormat() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 先获取一个动态ID
  const listResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 1
  }, TEST_CONFIG.testToken);
  
  if (listResult.code !== 200 || !listResult.data.list || listResult.data.list.length === 0) {
    console.log('  [跳过] 没有动态数据，跳过详情格式测试');
    return;
  }
  
  const dynId = listResult.data.list[0].id || listResult.data.list[0]._id;
  
  const result = await callAppApi('appGetDynDetail', {
    id: dynId
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.dyn) {
    throw new Error('缺少dyn对象');
  }
  
  validatePostFormat(result.data.dyn);
  console.log('  [信息] 动态详情格式正确');
}

/**
 * 测试3: 评论列表数据格式
 */
async function testCommentListFormat() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 先获取一个动态ID
  const listResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 1
  }, TEST_CONFIG.testToken);
  
  if (listResult.code !== 200 || !listResult.data.list || listResult.data.list.length === 0) {
    console.log('  [跳过] 没有动态数据，跳过评论格式测试');
    return;
  }
  
  const dynId = listResult.data.list[0].id || listResult.data.list[0]._id;
  
  const result = await callAppApi('appGetDynComment', {
    id: dynId,
    page: 1,
    limit: 5
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  // 验证每条评论的格式
  for (let i = 0; i < result.data.list.length; i++) {
    const comment = result.data.list[i];
    try {
      validateCommentFormat(comment);
      console.log(`  [信息] 评论${i + 1}格式正确`);
    } catch (error) {
      throw new Error(`评论${i + 1}格式错误: ${error.message}`);
    }
  }
  
  console.log(`  [信息] 验证了${result.data.list.length}条评论的格式`);
}

/**
 * 测试4: 用户信息数据格式
 */
async function testUserInfoFormat() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetCurrentUserProfile', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!result.data.userInfo) {
    throw new Error('缺少userInfo对象');
  }
  
  validateUserFormat(result.data.userInfo);
  console.log('  [信息] 用户信息格式正确');
}

/**
 * 测试5: 用户主页数据格式
 */
async function testUserProfileFormat() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetUserProfile', {
    userId: TEST_CONFIG.testOpenId
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.userInfo) {
    throw new Error('缺少userInfo对象');
  }
  
  validateUserFormat(result.data.userInfo);
  console.log('  [信息] 用户主页格式正确');
}

/**
 * 测试6: 用户动态列表数据格式
 */
async function testUserDynListFormat() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetUserDynList', {
    userId: TEST_CONFIG.testOpenId,
    page: 1,
    limit: 5
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  // 验证每条动态的格式
  for (let i = 0; i < result.data.list.length; i++) {
    const post = result.data.list[i];
    try {
      validatePostFormat(post);
    } catch (error) {
      throw new Error(`用户动态${i + 1}格式错误: ${error.message}`);
    }
  }
  
  console.log(`  [信息] 验证了${result.data.list.length}条用户动态的格式`);
}

/**
 * 运行所有数据格式测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('数据格式测试');
  
  if (!TEST_CONFIG.testToken) {
    console.log('\n[警告] 缺少token，请先运行认证模块测试');
    const summary = endTestSuite();
    return summary;
  }
  
  await runTest('1. 动态列表数据格式', testDynListFormat);
  await runTest('2. 动态详情数据格式', testDynDetailFormat);
  await runTest('3. 评论列表数据格式', testCommentListFormat);
  await runTest('4. 用户信息数据格式', testUserInfoFormat);
  await runTest('5. 用户主页数据格式', testUserProfileFormat);
  await runTest('6. 用户动态列表数据格式', testUserDynListFormat);
  
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
  runAllTests,
  validatePostFormat,
  validateCommentFormat,
  validateUserFormat
};
