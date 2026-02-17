// 模拟测试数据
// 版本: 1.0.0

/**
 * 生成模拟用户数据
 */
function generateMockUser(overrides = {}) {
  return {
    openId: overrides.openId || `mock_user_${Date.now()}`,
    nickName: overrides.nickName || `测试用户${Math.random().toString(36).substring(2, 6)}`,
    avatarUrl: overrides.avatarUrl || null,
    signature: overrides.signature || '这是一个测试用户',
    joinStatus: overrides.joinStatus !== undefined ? overrides.joinStatus : 1,
    usersSecret: overrides.usersSecret || [{
      vipStatus: overrides.vipStatus || false,
      vipStartTime: overrides.vipStartTime || 0,
      vipEndTime: overrides.vipEndTime || 0,
      vipConfig: overrides.vipConfig || {}
    }],
    ...overrides
  };
}

/**
 * 生成模拟动态数据
 */
function generateMockDyn(overrides = {}) {
  return {
    _id: overrides._id || `mock_dyn_${Date.now()}`,
    openId: overrides.openId || `mock_user_${Date.now()}`,
    dynContent: overrides.dynContent || '这是一条测试动态',
    imageIds: overrides.imageIds || [],
    imageList: overrides.imageList || [],
    circleId: overrides.circleId || '测试圈子',
    circleTitle: overrides.circleTitle || '测试圈子',
    publicTime: overrides.publicTime || Date.now(),
    likeNums: overrides.likeNums || 0,
    commentNums: overrides.commentNums || 0,
    forwardNums: overrides.forwardNums || 0,
    chargeNums: overrides.chargeNums || 0,
    like: overrides.like || [],
    ...overrides
  };
}

/**
 * 生成模拟评论数据
 */
function generateMockComment(overrides = {}) {
  return {
    _id: overrides._id || `mock_comment_${Date.now()}`,
    dynId: overrides.dynId || `mock_dyn_${Date.now()}`,
    openId: overrides.openId || `mock_user_${Date.now()}`,
    from: overrides.from || overrides.openId,
    to: overrides.to || overrides.openId,
    commentContent: overrides.commentContent || '这是一条测试评论',
    imagePath: overrides.imagePath || null,
    createTime: overrides.createTime || Date.now(),
    likeNums: overrides.likeNums || 0,
    like: overrides.like || [],
    comStatus: overrides.comStatus || 0,
    ...overrides
  };
}

/**
 * 生成模拟圈子数据
 */
function generateMockCircle(overrides = {}) {
  return {
    _id: overrides._id || `mock_circle_${Date.now()}`,
    circleId: overrides.circleId || `测试圈子_${Date.now()}`,
    circleTitle: overrides.circleTitle || `测试圈子标题`,
    desc: overrides.desc || '这是一个测试圈子',
    ...overrides
  };
}

/**
 * 生成模拟话题数据
 */
function generateMockTopic(overrides = {}) {
  return {
    _id: overrides._id || `mock_topic_${Date.now()}`,
    topic: overrides.topic || `测试话题_${Date.now()}`,
    topicId: overrides.topicId || `topic_${Date.now()}`,
    ...overrides
  };
}

/**
 * 生成base64图片数据（模拟）
 */
function generateMockImageData() {
  // 这是一个1x1像素的透明PNG图片的base64编码
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

/**
 * 生成测试用的微信code
 */
function generateWechatCode() {
  return `test_wechat_code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

module.exports = {
  generateMockUser,
  generateMockDyn,
  generateMockComment,
  generateMockCircle,
  generateMockTopic,
  generateMockImageData,
  generateWechatCode
};
