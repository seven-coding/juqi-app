// 响应格式化工具
// 版本: 2.0.0 - App测试环境

/**
 * 错误码定义
 */
const ERROR_CODES = {
  // 客户端错误 (4xx)
  BAD_REQUEST: 400,        // 请求参数错误
  UNAUTHORIZED: 401,        // 未登录或Token无效
  FORBIDDEN: 403,           // 无权限
  NOT_FOUND: 404,           // 资源不存在
  
  // 服务器错误 (5xx)
  INTERNAL_ERROR: 500,      // 服务器内部错误
  SERVICE_UNAVAILABLE: 503, // 服务不可用
  TIMEOUT: 504              // 请求超时
};

/**
 * 成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {object}
 */
function success(data, message = "成功") {
  return {
    code: 200,
    data,
    message,
    timestamp: Date.now()
  };
}

/**
 * 错误响应
 * @param {number} code - 错误码
 * @param {string} message - 错误消息
 * @param {any} data - 错误数据
 * @param {string} errorId - 错误ID（用于日志追踪）
 * @returns {object}
 */
function error(code, message, data = null, errorId = null) {
  // 生成错误ID（如果没有提供）
  if (!errorId) {
    errorId = `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  // 记录错误日志
  const errorLog = {
    errorId,
    code,
    message,
    timestamp: Date.now(),
    stack: new Error().stack
  };
  
  // 在开发环境输出详细错误信息
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Response]', errorLog);
  } else {
    // 生产环境只记录关键信息
    console.error(`[Error ${errorId}] ${code}: ${message}`);
  }
  
  return {
    code,
    message,
    data,
    errorId,
    timestamp: Date.now()
  };
}

/**
 * 参数验证错误
 * @param {string} field - 字段名
 * @param {string} reason - 错误原因
 * @returns {object}
 */
function validationError(field, reason = '参数无效') {
  return error(
    ERROR_CODES.BAD_REQUEST,
    `参数验证失败: ${field} - ${reason}`,
    { field, reason }
  );
}

/**
 * 权限错误
 * @param {string} reason - 错误原因
 * @returns {object}
 */
function forbiddenError(reason = '无权限执行此操作') {
  return error(
    ERROR_CODES.FORBIDDEN,
    reason,
    null
  );
}

/**
 * 未找到资源错误
 * @param {string} resource - 资源名称
 * @returns {object}
 */
function notFoundError(resource = '资源') {
  return error(
    ERROR_CODES.NOT_FOUND,
    `${resource}不存在`,
    { resource }
  );
}

/**
 * 服务器内部错误
 * @param {Error} err - 错误对象
 * @param {string} context - 错误上下文
 * @returns {object}
 */
function internalError(err, context = '服务器错误') {
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // 记录完整错误信息
  console.error(`[Internal Error ${errorId}]`, {
    context,
    message: err.message,
    stack: err.stack,
    timestamp: Date.now()
  });
  
  // 始终返回 data: null，避免客户端将错误响应当作成功结构（如 LoginData）解码失败
  return error(
    ERROR_CODES.INTERNAL_ERROR,
    process.env.NODE_ENV === 'production'
      ? '服务器内部错误，请稍后重试'
      : `${context}: ${err.message}`,
    null,
    errorId
  );
}

module.exports = {
  success,
  error,
  validationError,
  forbiddenError,
  notFoundError,
  internalError,
  ERROR_CODES
};
