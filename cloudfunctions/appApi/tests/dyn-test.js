// 动态模块测试
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
 * 测试1: appGetDynList - 获取全部动态
 */
async function testGetDynListAll() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetDynList', {
    type: 'all',
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  // 验证数据格式
  if (result.data.list.length > 0) {
    const dyn = result.data.list[0];
    if (!dyn.id) {
      throw new Error('动态缺少id字段');
    }
    if (!dyn.userId) {
      throw new Error('动态缺少userId字段');
    }
    if (!dyn.content) {
      throw new Error('动态缺少content字段');
    }
    if (!dyn.publishTime) {
      throw new Error('动态缺少publishTime字段');
    }
    
    // 保存第一个动态ID供后续测试使用
    TEST_CONFIG.testDynId = dyn.id;
    console.log(`  [信息] 获取到${result.data.list.length}条动态，保存第一条动态ID: ${TEST_CONFIG.testDynId}`);
  } else {
    console.log('  [信息] 动态列表为空');
  }
}

/**
 * 测试2: appGetDynList - 获取关注动态
 */
async function testGetDynListFollow() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetDynList', {
    type: 'follow',
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  console.log(`  [信息] 获取到${result.data.list.length}条关注动态`);
}

/**
 * 测试3: appGetDynList - 缺少type参数
 */
async function testGetDynListMissingType() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetDynList', {
    page: 1,
    limit: 10
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, 'type');
}

/**
 * 测试4: appGetDynDetail - 获取动态详情
 */
async function testGetDynDetail() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有动态ID，先获取一个
  if (!TEST_CONFIG.testDynId) {
    const listResult = await callAppApi('appGetDynList', {
      type: 'all',
      page: 1,
      limit: 1
    }, TEST_CONFIG.testToken);
    
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testDynId = listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有动态数据，跳过详情测试');
      return;
    }
  }
  
  const result = await callAppApi('appGetDynDetail', {
    id: TEST_CONFIG.testDynId
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.dyn) {
    throw new Error('缺少dyn对象');
  }
  
  // 验证数据格式
  const dyn = result.data.dyn;
  if (!dyn.id) {
    throw new Error('动态缺少id字段');
  }
  
  console.log('  [信息] 动态详情获取成功');
}

/**
 * 测试5: appGetDynDetail - 动态不存在
 */
async function testGetDynDetailNotFound() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appGetDynDetail', {
    id: 'non_existent_dyn_' + Date.now()
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 404);
}

/**
 * 测试6: appPublishDyn - 发布纯文本动态
 */
async function testPublishDynText() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appPublishDyn', {
    dynContent: `测试动态内容_${Date.now()}`,
    circleId: '测试圈子',
    circleTitle: '测试圈子',
    imageIds: [],
    topic: [],
    ait: []
  }, TEST_CONFIG.testToken);
  
  // 如果用户未通过验证，返回403是正常的
  if (result.code === 403 && result.message && result.message.includes('未通过验证')) {
    console.log('  [跳过] 用户未通过验证，无法发布动态（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  if (!result.data.dynId) {
    throw new Error('缺少dynId');
  }
  
  TEST_CONFIG.testDynId = result.data.dynId;
  console.log('  [信息] 动态发布成功，dynId:', TEST_CONFIG.testDynId);
}

/**
 * 测试7: appPublishDyn - 内容为空
 */
async function testPublishDynEmptyContent() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appPublishDyn', {
    circleId: '测试圈子',
    circleTitle: '测试圈子',
    imageIds: [],
    topic: [],
    ait: []
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '内容不能为空');
}

/**
 * 测试8: appPublishDyn - 缺少圈子信息
 */
async function testPublishDynMissingCircle() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appPublishDyn', {
    dynContent: '测试内容',
    circleTitle: '测试圈子'
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '圈子信息');
}

/**
 * 测试9: appLikeDyn - 点赞动态
 */
async function testLikeDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有动态ID，先获取一个
  if (!TEST_CONFIG.testDynId) {
    const listResult = await callAppApi('appGetDynList', {
      type: 'all',
      page: 1,
      limit: 1
    }, TEST_CONFIG.testToken);
    
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testDynId = listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有动态数据，跳过点赞测试');
      return;
    }
  }
  
  const result = await callAppApi('appLikeDyn', {
    id: TEST_CONFIG.testDynId
  }, TEST_CONFIG.testToken);
  
  // 如果用户未通过验证，返回403是正常的
  if (result.code === 403) {
    console.log('  [跳过] 用户未通过验证，无法点赞（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  console.log('  [信息] 点赞成功');
}

/**
 * 测试10: appLikeDyn - 动态不存在
 */
async function testLikeDynNotFound() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appLikeDyn', {
    id: 'non_existent_dyn_' + Date.now()
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 404);
}

/**
 * 测试11: appChargeDyn - 充电动态
 */
async function testChargeDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有动态ID，先获取一个
  if (!TEST_CONFIG.testDynId) {
    const listResult = await callAppApi('appGetDynList', {
      type: 'all',
      page: 1,
      limit: 1
    }, TEST_CONFIG.testToken);
    
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testDynId = listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有动态数据，跳过充电测试');
      return;
    }
  }
  
  const result = await callAppApi('appChargeDyn', {
    id: TEST_CONFIG.testDynId
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  console.log('  [信息] 充电成功');
}

/**
 * 测试12: appDeleteDyn - 删除动态
 */
async function testDeleteDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有动态ID，先发布一个
  if (!TEST_CONFIG.testDynId) {
    const publishResult = await callAppApi('appPublishDyn', {
      dynContent: `测试删除动态_${Date.now()}`,
      circleId: '测试圈子',
      circleTitle: '测试圈子',
      imageIds: [],
      topic: [],
      ait: []
    }, TEST_CONFIG.testToken);
    
    if (publishResult.code === 200 && publishResult.data.dynId) {
      TEST_CONFIG.testDynId = publishResult.data.dynId;
    } else {
      console.log('  [跳过] 无法发布动态，跳过删除测试');
      return;
    }
  }
  
  const result = await callAppApi('appDeleteDyn', {
    id: TEST_CONFIG.testDynId
  }, TEST_CONFIG.testToken);
  
  // 如果动态不是自己的，返回403是正常的
  if (result.code === 403) {
    console.log('  [跳过] 无权删除他人动态（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  console.log('  [信息] 删除成功');
}

/**
 * 测试13: appGetDynComment - 获取评论列表
 */
async function testGetDynComment() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有动态ID，先获取一个
  if (!TEST_CONFIG.testDynId) {
    const listResult = await callAppApi('appGetDynList', {
      type: 'all',
      page: 1,
      limit: 1
    }, TEST_CONFIG.testToken);
    
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testDynId = listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有动态数据，跳过评论列表测试');
      return;
    }
  }
  
  const result = await callAppApi('appGetDynComment', {
    id: TEST_CONFIG.testDynId,
    page: 1,
    limit: 20
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.list)) {
    throw new Error('list不是数组');
  }
  
  // 验证评论数据格式
  if (result.data.list.length > 0) {
    const comment = result.data.list[0];
    if (!comment.id) {
      throw new Error('评论缺少id字段');
    }
    if (!comment.userId) {
      throw new Error('评论缺少userId字段');
    }
    if (!comment.content) {
      throw new Error('评论缺少content字段');
    }
  }
  
  console.log(`  [信息] 获取到${result.data.list.length}条评论`);
}

/**
 * 测试14: appCommentDyn - 评论动态
 */
async function testCommentDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有动态ID，先获取一个
  if (!TEST_CONFIG.testDynId) {
    const listResult = await callAppApi('appGetDynList', {
      type: 'all',
      page: 1,
      limit: 1
    }, TEST_CONFIG.testToken);
    
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testDynId = listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有动态数据，跳过评论测试');
      return;
    }
  }
  
  const result = await callAppApi('appCommentDyn', {
    id: TEST_CONFIG.testDynId,
    commentContent: `测试评论_${Date.now()}`
  }, TEST_CONFIG.testToken);
  
  // 如果用户未通过验证，返回403是正常的
  if (result.code === 403) {
    console.log('  [跳过] 用户未通过验证，无法评论（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  if (!result.data.commentId) {
    throw new Error('缺少commentId');
  }
  
  console.log('  [信息] 评论成功');
}

/**
 * 测试15: appCommentDyn - 内容为空
 */
async function testCommentDynEmptyContent() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  if (!TEST_CONFIG.testDynId) {
    console.log('  [跳过] 没有动态ID，跳过测试');
    return;
  }
  
  const result = await callAppApi('appCommentDyn', {
    id: TEST_CONFIG.testDynId
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '内容不能为空');
}

/**
 * 测试16: appRepostDyn - 转发动态
 */
async function testRepostDyn() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  // 如果没有动态ID，先获取一个
  if (!TEST_CONFIG.testDynId) {
    const listResult = await callAppApi('appGetDynList', {
      type: 'all',
      page: 1,
      limit: 1
    }, TEST_CONFIG.testToken);
    
    if (listResult.code === 200 && listResult.data.list.length > 0) {
      TEST_CONFIG.testDynId = listResult.data.list[0].id;
    } else {
      console.log('  [跳过] 没有动态数据，跳过转发测试');
      return;
    }
  }
  
  const result = await callAppApi('appRepostDyn', {
    id: TEST_CONFIG.testDynId,
    circleId: '测试圈子',
    circleTitle: '测试圈子'
  }, TEST_CONFIG.testToken);
  
  // 如果用户未通过验证，返回403是正常的
  if (result.code === 403) {
    console.log('  [跳过] 用户未通过验证，无法转发（正常）');
    return;
  }
  
  validateResponse(result, 200);
  
  if (!result.data.dynId) {
    throw new Error('缺少dynId');
  }
  
  console.log('  [信息] 转发成功');
}

/**
 * 运行所有动态模块测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('动态模块测试');
  
  if (!TEST_CONFIG.testToken) {
    console.log('\n[警告] 缺少token，请先运行认证模块测试');
    const summary = endTestSuite();
    return summary;
  }
  
  await runTest('1. appGetDynList - 获取全部动态', testGetDynListAll);
  await runTest('2. appGetDynList - 获取关注动态', testGetDynListFollow);
  await runTest('3. appGetDynList - 缺少type参数', testGetDynListMissingType);
  await runTest('4. appGetDynDetail - 获取动态详情', testGetDynDetail);
  await runTest('5. appGetDynDetail - 动态不存在', testGetDynDetailNotFound);
  await runTest('6. appPublishDyn - 发布纯文本动态', testPublishDynText);
  await runTest('7. appPublishDyn - 内容为空', testPublishDynEmptyContent);
  await runTest('8. appPublishDyn - 缺少圈子信息', testPublishDynMissingCircle);
  await runTest('9. appLikeDyn - 点赞动态', testLikeDyn);
  await runTest('10. appLikeDyn - 动态不存在', testLikeDynNotFound);
  await runTest('11. appChargeDyn - 充电动态', testChargeDyn);
  await runTest('12. appDeleteDyn - 删除动态', testDeleteDyn);
  await runTest('13. appGetDynComment - 获取评论列表', testGetDynComment);
  await runTest('14. appCommentDyn - 评论动态', testCommentDyn);
  await runTest('15. appCommentDyn - 内容为空', testCommentDynEmptyContent);
  await runTest('16. appRepostDyn - 转发动态', testRepostDyn);
  
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
