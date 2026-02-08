// Token验证工具
// 版本: 2.0.0 - App测试环境
const jwt = require('jsonwebtoken');
const privateKey = '601a5dd02c01d5d9e0e776fde804f27d';
const TOKEN_EXPIRES_IN = '30d'; // Token有效期
const TOKEN_REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7天（毫秒）- Token即将过期阈值

/**
 * 验证Token并解析openId
 * @param {string} token - 用户Token
 * @returns {object} { openId, valid, expired, needRefresh, expiresAt }
 */
function verifyToken(token) {
  if (!token) {
    return { 
      valid: false, 
      openId: null, 
      expired: false, 
      needRefresh: false,
      expiresAt: null,
      error: 'Token为空'
    };
  }

  try {
    // 先解码（不验证）以获取过期时间
    const decoded = jwt.decode(token);
    if (!decoded) {
      return { 
        valid: false, 
        openId: null, 
        expired: true, 
        needRefresh: false,
        expiresAt: null,
        error: 'Token格式无效'
      };
    }

    // 验证Token（会检查过期）
    try {
      jwt.verify(token, privateKey);
      
      // Token有效，检查是否需要刷新
      const expiresAt = decoded.exp ? decoded.exp * 1000 : null; // 转换为毫秒
      const now = Date.now();
      const needRefresh = expiresAt && (expiresAt - now) < TOKEN_REFRESH_THRESHOLD;
      
      return { 
        valid: true, 
        openId: decoded.openId, 
        expired: false, 
        needRefresh: needRefresh,
        expiresAt: expiresAt,
        error: null
      };
    } catch (verifyError) {
      // Token验证失败（可能是过期）
      const isExpired = verifyError.name === 'TokenExpiredError';
      return { 
        valid: false, 
        openId: decoded.openId, 
        expired: isExpired, 
        needRefresh: false,
        expiresAt: decoded.exp ? decoded.exp * 1000 : null,
        error: isExpired ? 'Token已过期' : 'Token验证失败'
      };
    }
  } catch (error) {
    return { 
      valid: false, 
      openId: null, 
      expired: false, 
      needRefresh: false,
      expiresAt: null,
      error: error.message || 'Token解析失败'
    };
  }
}

/**
 * 生成Token
 * @param {string} openId - 用户openId
 * @returns {string} Token
 */
function generateToken(openId) {
  return jwt.sign({ openId }, privateKey, { expiresIn: TOKEN_EXPIRES_IN });
}

/**
 * 刷新Token（如果Token即将过期或已过期但openId有效）
 * @param {string} token - 当前Token
 * @returns {object} { newToken, openId, success }
 */
function refreshTokenIfNeeded(token) {
  const tokenResult = verifyToken(token);
  
  // Token有效且不需要刷新
  if (tokenResult.valid && !tokenResult.needRefresh) {
    return {
      newToken: null,
      openId: tokenResult.openId,
      success: true,
      refreshed: false
    };
  }
  
  // Token已过期或需要刷新，但openId有效，可以刷新
  if (tokenResult.openId && (tokenResult.expired || tokenResult.needRefresh)) {
    const newToken = generateToken(tokenResult.openId);
    return {
      newToken: newToken,
      openId: tokenResult.openId,
      success: true,
      refreshed: true
    };
  }
  
  // 无法刷新
  return {
    newToken: null,
    openId: null,
    success: false,
    refreshed: false,
    error: tokenResult.error || '无法刷新Token'
  };
}

module.exports = {
  verifyToken,
  generateToken,
  refreshTokenIfNeeded,
  TOKEN_EXPIRES_IN,
  TOKEN_REFRESH_THRESHOLD
};
