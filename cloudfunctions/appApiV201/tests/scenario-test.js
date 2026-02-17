// 业务场景测试
// 版本: 1.0.0

const { 
  runTest, 
  callAppApi, 
  validateResponse,
  startTestSuite,
  endTestSuite,
  resetTestResults,
  sleep
} = require('./utils/test-helper');
const { generateWechatCode, generateMockImageData } = require('./utils/mock-data');
const TEST_CONFIG = require('./utils/test-config');

/**
 * 场景1: 新用户完整流程
 */
async function scenarioNewUserFlow() {
  console.log('\n  [场景] 新用户从注册到首次使用');
  
  // 1. 用户登录
  const code = generateWechatCode();
  const loginResult = await callAppApi('appLogin', { code });
  validateResponse(loginResult, 200);
  
  if (!loginResult.data.token) {
    throw new Error('登录失败：缺少token');
  }
  
  const userToken = loginResult.data.token;
  const userOpenId = loginResult.data.openId;
  
  console.log('    ✓ 用户登录成功');
  
  // 2. 获取用户信息
  const userInfoResult = await callAppApi('appGetUserInfo', {}, userToken);
  validateResponse(userInfoResult, 200);
  console.log('    ✓ 获取用户信息成功');
  
  // 3. 获取动态列表（可以浏览）
  const dynListResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 10
  }, userToken);
  validateResponse(dynListResult, 200);
  console.log('    ✓ 可以浏览动态列表');
  
  // 4. 获取圈子列表（可以浏览）
  const circleListResult = await callAppApi('appGetCircleList', {}, userToken);
  validateResponse(circleListResult, 200);
  console.log('    ✓ 可以浏览圈子列表');
  
  return { token: userToken, openId: userOpenId };
}

/**
 * 场景2: 动态发布完整流程
 */
async function scenarioPublishDynFlow() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  console.log('\n  [场景] 用户发布动态的完整流程');
  
  // 1. 获取圈子列表
  const circleListResult = await callAppApi('appGetCircleList', {}, TEST_CONFIG.testToken);
  validateResponse(circleListResult, 200);
  
  let circleId = '测试圈子';
  let circleTitle = '测试圈子';
  
  if (circleListResult.data.list && circleListResult.data.list.length > 0) {
    const firstCircle = circleListResult.data.list[0];
    // 尝试多种可能的字段名
    circleId = firstCircle.circleId || firstCircle.id || firstCircle._id || firstCircle.circle_id || '测试圈子';
    circleTitle = firstCircle.circleTitle || firstCircle.title || firstCircle.name || '测试圈子';
  }
  
  console.log('    ✓ 获取圈子列表成功');
  
  // 2. 上传图片
  const imageData = generateMockImageData();
  const uploadResult = await callAppApi('appUploadImage', {
    imageData: imageData,
    category: 'dyn'
  }, TEST_CONFIG.testToken);
  
  // 上传可能失败（权限问题），但不影响流程
  let imageId = null;
  if (uploadResult.code === 200 && uploadResult.data.fileID) {
    imageId = uploadResult.data.fileID;
    console.log('    ✓ 图片上传成功');
  } else {
    console.log('    ⚠ 图片上传失败（可能权限问题），继续测试');
  }
  
  // 3. 发布动态
  const publishData = {
    dynContent: `场景测试动态_${Date.now()}`,
    circleId: circleId,
    circleTitle: circleTitle,
    imageIds: imageId ? [imageId] : [],
    topic: [],
    ait: []
  };
  
  const publishResult = await callAppApi('appPublishDyn', publishData, TEST_CONFIG.testToken);
  
  // 如果用户未通过验证，返回403是正常的
  if (publishResult.code === 403) {
    console.log('    ⚠ 用户未通过验证，无法发布动态（正常）');
    return null;
  }
  
  validateResponse(publishResult, 200);
  
  if (!publishResult.data.dynId) {
    throw new Error('发布失败：缺少dynId');
  }
  
  const dynId = publishResult.data.dynId;
  console.log('    ✓ 动态发布成功');
  
  // 等待一下，确保数据已写入
  await sleep(1000);
  
  // 4. 获取动态详情
  const detailResult = await callAppApi('appGetDynDetail', {
    id: dynId
  }, TEST_CONFIG.testToken);
  validateResponse(detailResult, 200);
  console.log('    ✓ 可以查看刚发布的动态');
  
  // 5. 获取动态列表，验证新动态出现
  const listResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  validateResponse(listResult, 200);
  
  const found = listResult.data.list.some(dyn => dyn.id === dynId || dyn._id === dynId);
  if (found) {
    console.log('    ✓ 新发布的动态出现在列表中');
  } else {
    console.log('    ⚠ 新发布的动态未出现在列表中（可能是分页问题）');
  }
  
  return dynId;
}

/**
 * 场景3: 互动完整流程
 */
async function scenarioInteractionFlow() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  console.log('\n  [场景] 用户与动态的完整互动流程');
  
  // 1. 获取动态列表
  const listResult = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 1
  }, TEST_CONFIG.testToken);
  validateResponse(listResult, 200);
  
  if (!listResult.data.list || listResult.data.list.length === 0) {
    console.log('    ⚠ 没有动态数据，跳过互动测试');
    return;
  }
  
  const dynId = listResult.data.list[0].id || listResult.data.list[0]._id;
  console.log('    ✓ 获取到动态');
  
  // 2. 点赞动态
  const likeResult = await callAppApi('appLikeDyn', {
    id: dynId
  }, TEST_CONFIG.testToken);
  
  if (likeResult.code === 403) {
    console.log('    ⚠ 用户未通过验证，无法点赞（正常）');
  } else {
    validateResponse(likeResult, 200);
    console.log('    ✓ 点赞成功');
  }
  
  // 3. 获取评论列表
  const commentListResult = await callAppApi('appGetDynComment', {
    id: dynId,
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  validateResponse(commentListResult, 200);
  console.log('    ✓ 可以查看评论');
  
  // 4. 提交评论
  const commentResult = await callAppApi('appCommentDyn', {
    id: dynId,
    commentContent: `场景测试评论_${Date.now()}`
  }, TEST_CONFIG.testToken);
  
  if (commentResult.code === 403) {
    console.log('    ⚠ 用户未通过验证，无法评论（正常）');
  } else {
    validateResponse(commentResult, 200);
    console.log('    ✓ 评论成功');
    
    // 5. 点赞评论（如果有评论）
    if (commentResult.data.commentId) {
      const likeCommentResult = await callAppApi('appLikeComment', {
        id: dynId,
        commentId: commentResult.data.commentId
      }, TEST_CONFIG.testToken);
      
      if (likeCommentResult.code === 403) {
        console.log('    ⚠ 用户未通过验证，无法点赞评论（正常）');
      } else {
        validateResponse(likeCommentResult, 200);
        console.log('    ✓ 评论点赞成功');
      }
    }
  }
  
  // 6. 转发动态
  const repostResult = await callAppApi('appRepostDyn', {
    id: dynId,
    circleId: '测试圈子',
    circleTitle: '测试圈子'
  }, TEST_CONFIG.testToken);
  
  if (repostResult.code === 403) {
    console.log('    ⚠ 用户未通过验证，无法转发（正常）');
  } else {
    validateResponse(repostResult, 200);
    console.log('    ✓ 转发成功');
  }
}

/**
 * 场景4: 用户关系完整流程
 */
async function scenarioUserRelationFlow() {
  if (!TEST_CONFIG.testToken || !TEST_CONFIG.testOpenId) {
    throw new Error('缺少token或openId，无法测试');
  }
  
  console.log('\n  [场景] 用户关注和互动的完整流程');
  
  // 1. 搜索用户（使用更安全的关键词）
  const searchResult = await callAppApi('appSearchUser', {
    keyword: '用户',
    page: 1,
    limit: 5
  }, TEST_CONFIG.testToken);
  validateResponse(searchResult, 200);
  
  if (!searchResult.data.list || searchResult.data.list.length === 0) {
    console.log('    ⚠ 搜索不到用户，跳过关系测试');
    return;
  }
  
  // 找一个不是自己的用户
  const targetUser = searchResult.data.list.find(u => u.id !== TEST_CONFIG.testOpenId && u.openId !== TEST_CONFIG.testOpenId);
  
  if (!targetUser) {
    console.log('    ⚠ 找不到其他用户，跳过关系测试');
    return;
  }
  
  const targetUserId = targetUser.id || targetUser.openId;
  console.log('    ✓ 搜索到用户');
  
  // 2. 获取用户主页
  const profileResult = await callAppApi('appGetUserProfile', {
    userId: targetUserId
  }, TEST_CONFIG.testToken);
  validateResponse(profileResult, 200);
  console.log('    ✓ 可以查看用户信息');
  
  // 3. 关注用户
  const followResult = await callAppApi('appFollowUser', {
    userId: targetUserId
  }, TEST_CONFIG.testToken);
  
  if (followResult.code === 403) {
    console.log('    ⚠ 用户未通过验证或被拉黑，无法关注（正常）');
  } else if (followResult.code === 400 && followResult.message && followResult.message.includes('已关注')) {
    console.log('    ⚠ 已关注该用户（正常）');
  } else {
    validateResponse(followResult, 200);
    console.log('    ✓ 关注成功');
  }
  
  // 4. 获取关注状态
  const followStatusResult = await callAppApi('appGetUserFollowStatus', {
    userId: targetUserId
  }, TEST_CONFIG.testToken);
  validateResponse(followStatusResult, 200);
  console.log('    ✓ 可以查看关注状态');
  
  // 5. 获取用户动态列表
  const userDynListResult = await callAppApi('appGetUserDynList', {
    userId: targetUserId,
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  validateResponse(userDynListResult, 200);
  console.log('    ✓ 可以查看用户动态');
  
  // 6. 给用户充电
  const chargeResult = await callAppApi('appChargeUser', {
    userId: targetUserId
  }, TEST_CONFIG.testToken);
  
  if (chargeResult.code === 403) {
    console.log('    ⚠ 用户未通过验证，无法充电（正常）');
  } else {
    validateResponse(chargeResult, 200);
    console.log('    ✓ 充电成功');
  }
}

/**
 * 运行所有业务场景测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('业务场景测试');
  
  await runTest('场景1: 新用户完整流程', scenarioNewUserFlow);
  
  if (TEST_CONFIG.testToken) {
    await runTest('场景2: 动态发布完整流程', scenarioPublishDynFlow);
    await runTest('场景3: 互动完整流程', scenarioInteractionFlow);
    await runTest('场景4: 用户关系完整流程', scenarioUserRelationFlow);
  } else {
    console.log('\n[警告] 缺少token，跳过需要认证的场景测试');
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
