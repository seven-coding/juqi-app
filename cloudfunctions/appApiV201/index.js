// 云函数入口文件
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在顶部调用 cloud.init()，改为在 main 函数内根据 dataEnv 动态初始化
// 这样可以确保每次请求都使用正确的环境

const MODULES = {
  auth: require('./modules/auth'),
  user: require('./modules/user'),
  dyn: require('./modules/dyn'),
  circle: require('./modules/circle'),
  message: require('./modules/message'),
  search: require('./modules/search'),
  upload: require('./modules/upload'),
};

const { verifyToken, refreshTokenIfNeeded } = require('./utils/token');
const { error } = require('./utils/response');
const { initCloudBySource, initCallEnvToSelf } = require('./utils/env');

// 不需要Token验证的接口列表
const NO_TOKEN_OPERATIONS = [
  'appLogin',
  'appRefreshToken'
];

/**
 * Token验证中间件
 * @param {object} event - 事件对象
 * @returns {object} { valid, openId, newToken, error }
 */
function validateToken(event) {
  const { operation, token } = event;
  
  // 不需要Token的接口直接通过
  if (NO_TOKEN_OPERATIONS.includes(operation)) {
    return { valid: true, openId: null, newToken: null, error: null };
  }
  
  // 需要Token但没有提供
  if (!token) {
    return { 
      valid: false, 
      openId: null, 
      newToken: null, 
      error: '未登录，请先登录' 
    };
  }
  
  // 验证Token
  const tokenResult = verifyToken(token);
  
  // Token无效
  if (!tokenResult.valid) {
    // Token已过期，尝试刷新
    if (tokenResult.expired && tokenResult.openId) {
      const refreshResult = refreshTokenIfNeeded(token);
      if (refreshResult.success && refreshResult.refreshed) {
        return {
          valid: true,
          openId: refreshResult.openId,
          newToken: refreshResult.newToken,
          error: null
        };
      }
    }
    
    return {
      valid: false,
      openId: null,
      newToken: null,
      error: tokenResult.error || 'Token无效'
    };
  }
  
  // Token有效，检查是否需要刷新
  if (tokenResult.needRefresh) {
    const refreshResult = refreshTokenIfNeeded(token);
    if (refreshResult.success && refreshResult.refreshed) {
      return {
        valid: true,
        openId: tokenResult.openId,
        newToken: refreshResult.newToken,
        error: null
      };
    }
  }
  
  // Token有效且不需要刷新
  return {
    valid: true,
    openId: tokenResult.openId,
    newToken: null,
    error: null
  };
}

// 云函数入口函数
exports.main = async (event, context) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  event.requestId = requestId;
  try {
    console.log(`[reqId=${requestId}][appApi] 收到请求: operation=${event.operation}, dataEnv=${event.dataEnv || event.data?.dataEnv || 'test(默认)'}`);
    const { operation, data, token, source, dataEnv } = event;

    if (!operation) {
      const res = { code: 400, message: "缺少operation参数" };
      res.requestId = requestId;
      return res;
    }

    // 数据环境：App 设置页可切换 测试数据/线上数据，未传时默认 test
    const envDataEnv = dataEnv || (data && data.dataEnv) || 'test';
    const { TEST_ENV_ID, PROD_ENV_ID } = require('./utils/env');
    const envId = envDataEnv === 'prod' ? PROD_ENV_ID : TEST_ENV_ID;
    event.envId = envId;
    event.dataEnv = envDataEnv; // 供模块区分：dataEnv=prod 时用当前 db（生产数据），子调用用测试环境逻辑

    // 根据 dataEnv 初始化云开发环境（只在此处初始化一次）
    const { db, _, $ } = initCloudBySource(source || 'v2', context, envDataEnv);
    
    console.log(`[reqId=${requestId}][appApi] 环境初始化: dataEnv=${envDataEnv}, envId=${envId}, source=${source || 'v2'}`);
    if (operation === 'appGetDynList') {
      console.log(`[reqId=${requestId}][appApi] 动态列表选库: dataEnv=${envDataEnv}, envId=${envId}`);
    }
    
    // 将数据库实例和操作符添加到event中，供模块使用
    event.db = db;
    event._ = _;
    event.$ = $;

    // 将 call 目标设为本环境，后续 cloud.callFunction 只打本环境，禁止跨环境调用
    initCallEnvToSelf();
    console.log(`[reqId=${requestId}][appApi] call 目标已设为本环境`);

    // Token验证
    const tokenValidation = validateToken(event);
    if (!tokenValidation.valid) {
      const errRes = error(401, tokenValidation.error || "未登录");
      errRes.requestId = requestId;
      return errRes;
    }
    
    // 如果有新Token，添加到响应中（客户端需要更新Token）
    let responseHeaders = {};
    if (tokenValidation.newToken) {
      responseHeaders['X-New-Token'] = tokenValidation.newToken;
    }
    
    // 将 openId 添加到 event 中，供模块使用；无 openId 时设为 ''，避免核心层 dealBlackDyn/getNoSeeList 收到 undefined 报错
    event.openId = tokenValidation.openId != null && tokenValidation.openId !== '' ? tokenValidation.openId : '';

    // 用户校验统一策略：测试环境默认放行（发帖/评论/转发/关注等 joinStatus 校验）
    const { shouldBypassUserCheck } = require('./utils/userValidation');
    event.bypassUserCheck = shouldBypassUserCheck(event);

    // 兼容旧接口名：将非app开头的接口映射到新接口
    let normalizedOperation = operation;
    const operationMapping = {
      'getMessagesNew': 'appGetMessageList',  // 旧消息接口 -> 新消息接口
      'setMessage': 'appSetMessage',          // 旧设置消息接口 -> 新接口
      'chat': 'appGetChatMessages',           // 申请/私信对话页拉 messageChat（type 20-23）
    };
    if (operationMapping[operation]) {
      console.log(`[reqId=${requestId}][appApi] 接口映射: ${operation} -> ${operationMapping[operation]}`);
      normalizedOperation = operationMapping[operation];
    }

    // 解析operation，格式：appLogin, appGetUserInfo等
    const methodName = normalizedOperation.replace('app', '');

    // 根据operation前缀路由到对应模块（使用规范化后的操作名）
    let module;
    if (normalizedOperation.startsWith('appLogin') || 
        normalizedOperation.startsWith('appGetUserInfo') || 
        normalizedOperation.startsWith('appRefreshToken') || 
        normalizedOperation.startsWith('appSubmitLanguageVerify') || 
        normalizedOperation.startsWith('appGetVerifyStatus')) {
      module = MODULES.auth;
    } else if (normalizedOperation.startsWith('appGetCurrentUser') || 
               normalizedOperation.startsWith('appGetUserProfile') || 
               normalizedOperation.startsWith('appUpdateUserInfo') || 
               normalizedOperation.startsWith('appFollowUser') || 
               normalizedOperation.startsWith('appUnfollowUser') || 
               normalizedOperation.startsWith('appGetUserFollowStatus') || 
               normalizedOperation.startsWith('appGetUserList') || 
               normalizedOperation.startsWith('appGetUserDynList') || 
               normalizedOperation.startsWith('appChargeUser') || 
               normalizedOperation.startsWith('appBlackUser') || 
               normalizedOperation.startsWith('appUnblackUser') || 
               normalizedOperation.startsWith('appSetUserStatus') || 
               normalizedOperation.startsWith('appGetUserActionHistory') || 
               normalizedOperation.startsWith('appSetUserAuth') || 
               normalizedOperation.startsWith('appGetChargeList') || 
               normalizedOperation.startsWith('appGetFavoriteList') || 
               normalizedOperation.startsWith('appGetBlackList') || 
               normalizedOperation.startsWith('appGetInviteCode') || 
               normalizedOperation.startsWith('appGetInviteCount') || 
               normalizedOperation.startsWith('appSaveAddress') ||
               normalizedOperation.startsWith('appUpdateVipConfig') ||
               normalizedOperation.startsWith('appGetChatId') ||
               normalizedOperation.startsWith('appRecordVisit') ||
               normalizedOperation.startsWith('appSetVisitStatus') ||
               normalizedOperation.startsWith('appGetNoVisitList') ||
               normalizedOperation.startsWith('appGetNoSeeList') ||
               normalizedOperation.startsWith('appGetNoSeeMeList')) {
      module = MODULES.user;
    } else if (normalizedOperation.startsWith('appGetDyn') || 
               normalizedOperation.startsWith('appPublishDyn') || 
               normalizedOperation.startsWith('appDeleteDyn') || 
               normalizedOperation.startsWith('appLikeDyn') || 
               normalizedOperation.startsWith('appCommentDyn') || 
               normalizedOperation.startsWith('appLikeComment') || 
               normalizedOperation.startsWith('appDeleteComment') || 
               normalizedOperation.startsWith('appRepostDyn') || 
               normalizedOperation.startsWith('appChargeDyn') || 
               normalizedOperation.startsWith('appFavoriteDyn') || 
               normalizedOperation.startsWith('appUnfavoriteDyn') ||
               normalizedOperation.startsWith('appSetUserProfilePin') ||
               normalizedOperation.startsWith('appReportDyn')) {
      module = MODULES.dyn;
    } else if (normalizedOperation.startsWith('appGetCircle') || 
               normalizedOperation.startsWith('appGetTopic') || 
               normalizedOperation.startsWith('appCreateTopic') || 
               normalizedOperation.startsWith('appJoinCircle') || 
               normalizedOperation.startsWith('appQuitCircle')) {
      module = MODULES.circle;
    } else if (normalizedOperation.startsWith('appGetMessage') ||
               normalizedOperation === 'appGetChatMessages' ||
               normalizedOperation === 'appSendChatMessage' ||
               normalizedOperation.startsWith('appSetMessage') ||
               normalizedOperation.startsWith('appGetUnreadCount') ||
               normalizedOperation.startsWith('appMarkMessagesRead')) {
      module = MODULES.message;
    } else if (normalizedOperation.startsWith('appSearch')) {
      module = MODULES.search;
    } else if (normalizedOperation.startsWith('appUpload')) {
      module = MODULES.upload;
    } else {
      const res = { code: 404, message: `未找到对应的模块: ${operation}` };
      res.requestId = requestId;
      return res;
    }

    // 调用模块方法
    if (module && typeof module[methodName] === 'function') {
      console.log(`[reqId=${requestId}][appApi] 调用模块: ${methodName}`);
      const result = await module[methodName](event, context);
      
      // 如果有新Token，添加到响应中
      if (tokenValidation.newToken && result && typeof result === 'object') {
        result.newToken = tokenValidation.newToken;
      }
      if (result && typeof result === 'object') {
        result.requestId = requestId;
      }
      
      console.log(`[reqId=${requestId}][appApi] 请求完成: code=${result?.code || 'N/A'}`);
      return result;
    } else {
      console.warn(`[reqId=${requestId}][appApi] 未实现的方法: ${methodName}`);
      const res = { code: 404, message: `未实现的方法: ${methodName}` };
      res.requestId = requestId;
      return res;
    }
  } catch (err) {
    console.error(`[reqId=${requestId}][appApi] 错误:`, err.message, err.stack);
    const res = { code: 500, message: err.message || "服务器错误" };
    res.requestId = requestId;
    return res;
  }
};
