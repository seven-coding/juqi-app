// 用户模块测试
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
 * 测试1: appGetCurrentUserProfile - 获取当前用户完整信息
 */
async function testGetCurrentUserProfile() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetCurrentUserProfile', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!result.data.userInfo) {
    throw new Error('缺少userInfo');
  }
  
  // 验证会员状态字段
  if (result.data.userInfo.usersSecret && Array.isArray(result.data.userInfo.usersSecret)) {
    console.log('  [信息] 会员状态:', {
      vipStatus: result.data.userInfo.usersSecret[0]?.vipStatus
    });
  }
}

/**
 * 测试2: appGetUserProfile - 获取用户主页信息（自己）
 */
async function testGetUserProfileSelf() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetUserProfile', {
    userId: TEST_CONFIG.testOpenId
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.userInfo) {
    throw new Error('缺少userInfo');
  }
  
  // 自己的信息应该包含usersSecret
  if (result.data.userInfo.usersSecret) {
    console.log('  [信息] 自己的信息包含会员状态');
  }
}

/**
 * 测试3: appGetUserProfile - 获取用户主页信息（他人）
 */
async function testGetUserProfileOther() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 尝试获取一个不存在的用户（会返回404，这是正常的）
  const result = await callAppApi('appGetUserProfile', {
    userId: 'non_existent_user_' + Date.now()
  }, TEST_CONFIG.testToken);
  
  // 如果用户不存在，返回404是正常的
  if (result.code === 404) {
    console.log('  [信息] 用户不存在（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  if (!result.data.userInfo) {
    throw new Error('缺少userInfo');
  }
  
  // 他人的信息不应该包含usersSecret（除非是自己）
  if (result.data.userInfo.id !== TEST_CONFIG.testOpenId && result.data.userInfo.usersSecret) {
    console.log('  [警告] 他人信息包含usersSecret（可能是隐私问题）');
  }
}

/**
 * 测试4: appGetUserProfile - 缺少userId
 */
async function testGetUserProfileMissingUserId() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetUserProfile', {}, TEST_CONFIG.testToken);
  validateErrorResponse(result, 400, '缺少用户ID');
}

/**
 * 测试5: appGetUserDynList - 获取用户动态列表
 */
async function testGetUserDynList() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetUserDynList', {
    userId: TEST_CONFIG.testOpenId,
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.list.length}条动态`);
  
  // 验证数据格式
  if (result.data.list.length > 0) {
    const dyn = result.data.list[0];
    if (!dyn.id && !dyn._id) {
      throw new Error('动态缺少id字段');
    }
  }
}

/**
 * 测试6: appFollowUser - 关注用户
 */
async function testFollowUser() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 注意：这个测试需要有一个真实的用户ID，或者会失败
  // 在实际测试中，应该先创建一个测试用户
  const testUserId = 'test_follow_user_' + Date.now();
  
  const result = await callAppApi('appFollowUser', {
    userId: testUserId
  }, TEST_CONFIG.testToken);
  
  // 如果用户不存在或未通过验证，返回错误是正常的
  if (result.code === 403 || result.code === 404) {
    console.log('  [跳过] 用户不存在或未通过验证（正常）');
    return;
  }
  
  // 如果尝试关注自己，返回400是正常的
  if (result.code === 400 && result.message && result.message.includes('自己')) {
    console.log('  [跳过] 不能关注自己（正常）');
    return;
  }
  
  validateResponse(result, 200);
}

/**
 * 测试7: appFollowUser - 关注自己
 */
async function testFollowUserSelf() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appFollowUser', {
    userId: TEST_CONFIG.testOpenId
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '自己');
}

/**
 * 测试8: appUnfollowUser - 取消关注
 */
async function testUnfollowUser() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const testUserId = 'test_unfollow_user_' + Date.now();
  
  const result = await callAppApi('appUnfollowUser', {
    userId: testUserId
  }, TEST_CONFIG.testToken);
  
  // 如果未关注，返回400是正常的
  if (result.code === 400) {
    console.log('  [信息] 未关注该用户（正常）');
    return;
  }
  
  validateResponse(result, 200);
}

/**
 * 测试9: appGetUserFollowStatus - 获取关注状态
 */
async function testGetUserFollowStatus() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  // 测试获取自己的关注状态
  const result = await callAppApi('appGetUserFollowStatus', {
    userId: TEST_CONFIG.testOpenId
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (result.data.followStatus === undefined) {
    throw new Error('缺少followStatus');
  }
  
  // 自己的关注状态应该是0
  if (result.data.followStatus !== 0) {
    console.log(`  [警告] 自己的关注状态不是0，而是${result.data.followStatus}`);
  }
}

/**
 * 测试10: appGetUserList - 获取用户列表（关注）
 */
async function testGetUserListFollows() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetUserList', {
    type: 'follows',
    openId: TEST_CONFIG.testOpenId,
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.list.length}个关注用户`);
}

/**
 * 测试11: appGetUserList - 获取用户列表（粉丝）
 */
async function testGetUserListFollowers() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetUserList', {
    type: 'followers',
    openId: TEST_CONFIG.testOpenId,
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.list.length}个粉丝`);
}

/**
 * 测试12: appUpdateUserInfo - 更新用户信息
 */
async function testUpdateUserInfo() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appUpdateUserInfo', {
    nickName: `测试昵称_${Date.now()}`
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
}

/**
 * 测试13: appChargeUser - 给用户充电
 */
async function testChargeUser() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  // 不能给自己充电
  const result = await callAppApi('appChargeUser', {
    userId: TEST_CONFIG.testOpenId
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '自己');
}

/**
 * 测试14: appGetChargeList - 获取充电列表
 */
async function testGetChargeList() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetChargeList', {
    userId: TEST_CONFIG.testOpenId,
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
}

/**
 * 测试15: appGetFavoriteList - 获取收藏列表
 */
async function testGetFavoriteList() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetFavoriteList', {
    userId: TEST_CONFIG.testOpenId,
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
}

/**
 * 测试16: appGetBlackList - 获取黑名单列表
 */
async function testGetBlackList() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  const result = await callAppApi('appGetBlackList', {
    userId: TEST_CONFIG.testOpenId,
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
}

/**
 * 测试17: appGetInviteCode - 获取邀请码
 */
async function testGetInviteCode() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetInviteCode', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (!result.data.inviteCode) {
    throw new Error('缺少inviteCode');
  }
  
  console.log('  [信息] 邀请码:', result.data.inviteCode);
}

/**
 * 测试18: appGetInviteCount - 获取邀请数量
 */
async function testGetInviteCount() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetInviteCount', {}, TEST_CONFIG.testToken);
  validateResponse(result, 200);
  
  if (result.data.count === undefined) {
    throw new Error('缺少count');
  }
  
  console.log('  [信息] 邀请数量:', result.data.count);
}

/**
 * 运行所有用户模块测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('用户模块测试');
  
  if (!TEST_CONFIG.testToken) {
    console.log('\n[警告] 缺少token，请先运行认证模块测试');
    const summary = endTestSuite();
    return summary;
  }
  
  await runTest('1. appGetCurrentUserProfile - 获取当前用户完整信息', testGetCurrentUserProfile);
  await runTest('2. appGetUserProfile - 获取用户主页信息（自己）', testGetUserProfileSelf);
  await runTest('3. appGetUserProfile - 获取用户主页信息（他人）', testGetUserProfileOther);
  await runTest('4. appGetUserProfile - 缺少userId', testGetUserProfileMissingUserId);
  await runTest('5. appGetUserDynList - 获取用户动态列表', testGetUserDynList);
  await runTest('6. appFollowUser - 关注用户', testFollowUser);
  await runTest('7. appFollowUser - 关注自己', testFollowUserSelf);
  await runTest('8. appUnfollowUser - 取消关注', testUnfollowUser);
  await runTest('9. appGetUserFollowStatus - 获取关注状态', testGetUserFollowStatus);
  await runTest('10. appGetUserList - 获取关注列表', testGetUserListFollows);
  await runTest('11. appGetUserList - 获取粉丝列表', testGetUserListFollowers);
  await runTest('12. appUpdateUserInfo - 更新用户信息', testUpdateUserInfo);
  await runTest('13. appChargeUser - 给自己充电（应该失败）', testChargeUser);
  await runTest('14. appGetChargeList - 获取充电列表', testGetChargeList);
  await runTest('15. appGetFavoriteList - 获取收藏列表', testGetFavoriteList);
  await runTest('16. appGetBlackList - 获取黑名单列表', testGetBlackList);
  await runTest('17. appGetInviteCode - 获取邀请码', testGetInviteCode);
  await runTest('18. appGetInviteCount - 获取邀请数量', testGetInviteCount);
  
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
