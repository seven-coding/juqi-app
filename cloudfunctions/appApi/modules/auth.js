// 认证模块
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { verifyToken, generateToken } = require('../utils/token');
const { success, error, validationError, internalError } = require('../utils/response');
const axios = require('axios');

// 微信App配置（从环境变量获取）
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';

// 开发模式标志（当环境变量未配置时，使用模拟模式）
const DEV_MODE = !WECHAT_APP_ID || WECHAT_APP_ID === 'your_app_id' || !WECHAT_APP_SECRET || WECHAT_APP_SECRET === 'your_app_secret';

if (DEV_MODE) {
  console.warn('[appLogin] ⚠️ 警告: 微信App配置未设置，将使用开发模式（模拟openId）');
  console.warn('[appLogin] 请设置环境变量: WECHAT_APP_ID 和 WECHAT_APP_SECRET');
}

/**
 * App登录接口
 * 通过微信code获取openId，查询用户状态，生成Token
 */
async function Login(event) {
  try {
    const { data, db } = event;
    const { code } = data || {};

    if (!code) {
      return validationError('code', '缺少code参数');
    }

    // 通过code获取openId
    let openId;
    let unionId = null;

    // 开发模式：固定测试 code 使用固定 openId，便于 App 端「测试登录」拿到稳定用户 token 并拉取数据
    const TEST_APP_CODE = 'test_app_debug';
    const TEST_APP_OPENID = 'test_openid_app';

    if (DEV_MODE) {
      if (code === TEST_APP_CODE) {
        openId = TEST_APP_OPENID;
        console.log('[appLogin] 开发模式: 使用固定测试用户 openId:', openId);
      } else {
        openId = `wechat_${code}_${Date.now()}`;
        console.log('[appLogin] 开发模式: 使用模拟openId:', openId);
      }
    } else {
      // 生产模式：调用真实的微信开放平台API
      try {
        // 调用微信开放平台API获取access_token和openid
        // 注意：这是移动应用（iOS/Android）的OAuth2.0流程
        const wechatResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
          params: {
            appid: WECHAT_APP_ID,
            secret: WECHAT_APP_SECRET,
            code: code,
            grant_type: 'authorization_code'
          },
          timeout: 10000 // 10秒超时
        });

        console.log('[appLogin] 微信API响应:', {
          errcode: wechatResponse.data.errcode,
          errmsg: wechatResponse.data.errmsg,
          hasOpenId: !!wechatResponse.data.openid
        });

        // 检查微信API返回的错误
        if (wechatResponse.data.errcode) {
          console.error('[appLogin] 微信API错误:', wechatResponse.data.errcode, wechatResponse.data.errmsg);
          return error(400, `微信授权失败: ${wechatResponse.data.errmsg || '未知错误'}`);
        }

        // 获取openId和unionId（如果有）
        openId = wechatResponse.data.openid;
        unionId = wechatResponse.data.unionid || null;

        if (!openId) {
          console.error('[appLogin] 微信API未返回openId');
          return error(400, "微信授权失败: 未获取到用户标识");
        }

        console.log('[appLogin] 成功获取openId:', openId.substring(0, 8) + '...');
      } catch (err) {
        console.error('[appLogin] 获取微信openId失败:', err.message);
        
        // 如果是网络错误
        if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
          return error(500, "微信授权服务超时，请稍后重试");
        }
        
        // 如果是axios错误，尝试获取响应数据
        if (err.response && err.response.data) {
          const errorData = err.response.data;
          return error(400, `微信授权失败: ${errorData.errmsg || errorData.message || '未知错误'}`);
        }
        
        return error(400, `微信授权失败: ${err.message || '网络错误'}`);
      }
    }

    // 查询用户信息（优先通过unionId查询，如果没有则通过openId）
    let userResult;
    if (unionId) {
      // 如果有unionId，优先通过unionId查询（支持跨平台用户识别）
      userResult = await db.collection('user').where({ unionid: unionId }).get();
      if (userResult.data.length === 0) {
        // 如果unionId查不到，再通过openId查询
        userResult = await db.collection('user').where({ openId }).get();
      }
    } else {
      // 没有unionId，直接通过openId查询
      userResult = await db.collection('user').where({ openId }).get();
    }
    
    let user;
    if (userResult.data.length > 0) {
      user = userResult.data[0];
      
      // 如果用户存在但没有unionId，且本次登录有unionId，则更新
      if (unionId && !user.unionid) {
        await db.collection('user').where({ openId: user.openId }).update({
          data: {
            unionid: unionId
          }
        });
        user.unionid = unionId;
      }
      
      // 如果用户存在但openId不同（通过unionId找到的），更新openId
      if (user.openId !== openId) {
        await db.collection('user').where({ _id: user._id }).update({
          data: {
            openId: openId
          }
        });
        user.openId = openId;
      }
    } else {
      // 新用户，创建用户记录
      user = await createNewUser(openId, unionId, db);
    }

    // 检查用户状态
    if (user.joinStatus === -2) {
      return error(403, "账号已被封禁", { joinStatus: user.joinStatus });
    }
    if (user.joinStatus === -1) {
      return error(403, "账号已被注销", { joinStatus: user.joinStatus });
    }

    // 生成Token
    const token = generateToken(openId);

    // 获取会员状态
    const vipStatus = user.usersSecret && user.usersSecret[0] && user.usersSecret[0].vipStatus || false;
    
    // 获取试用期信息
    let trialStartTime = null;
    if (!vipStatus && user.joinStatus === 1) {
      const trialRecord = await db.collection('trial_periods').where({ openId }).get();
      if (trialRecord.data.length === 0) {
        trialStartTime = Date.now();
        await db.collection('trial_periods').add({
          data: {
            openId,
            startTime: db.serverDate(),
            startTimestamp: trialStartTime,
            days: 7,
            createdAt: db.serverDate()
          }
        });
      } else {
        trialStartTime = trialRecord.data[0].startTimestamp;
      }
    }

    return success({
      token,
      openId,
      joinStatus: user.joinStatus,
      vipStatus,
      trialStartTime,
      trialDays: 7
    });
  } catch (err) {
    console.error('[appLogin] error:', err);
    return internalError(err, '登录处理失败');
  }
}

/**
 * 创建新用户
 */
async function createNewUser(openId, unionId, db) {
  const newUser = {
    openId,
    joinStatus: 0,
    nickName: `用户${openId.substring(0, 8)}`,
    createdAt: db.serverDate(),
    inviteUser: null
  };

  // 如果有unionId，添加到用户信息中
  if (unionId) {
    newUser.unionid = unionId;
  }

  await db.collection('user').add({
    data: newUser
  });

  return newUser;
}

/**
 * 获取用户信息
 */
async function GetUserInfo(event) {
  try {
    const { token, db, openId } = event;
    
    if (!openId) {
      return error(401, "未登录");
    }

    // 查询用户信息
    const userResult = await db.collection('user').where({ openId }).get();
    if (userResult.data.length === 0) {
      return error(404, "用户不存在");
    }

    const user = userResult.data[0];
    const vipStatus = user.usersSecret && user.usersSecret[0] && user.usersSecret[0].vipStatus || false;

    // 获取试用期信息
    let trialStartTime = null;
    try {
      const trialRecord = await db.collection('trial_periods').where({ openId }).get();
      if (trialRecord.data && trialRecord.data.length > 0) {
        trialStartTime = trialRecord.data[0].startTimestamp;
      }
    } catch (err) {
      // 如果集合不存在，忽略错误，trialStartTime保持为null
      console.log('[appGetUserInfo] 试用期集合不存在或查询失败:', err.message);
    }

    return success({
      userStatus: {
        joinStatus: user.joinStatus,
        vipStatus,
        trialStartTime,
        trialDays: 7
      }
    });
  } catch (err) {
    console.error('[appGetUserInfo] error:', err);
    return error(500, err.message || "获取用户信息失败");
  }
}

/**
 * 刷新Token
 */
async function RefreshToken(event) {
  try {
    const { token } = event;
    
    if (!token) {
      return error(401, "未登录");
    }

    const tokenResult = verifyToken(token);
    
    if (!tokenResult.valid) {
      if (tokenResult.expired && tokenResult.openId) {
        const newToken = generateToken(tokenResult.openId);
        return success({
          token: newToken,
          refreshed: true
        });
      }
      return error(401, tokenResult.error || "Token无效，请重新登录");
    }

    if (tokenResult.needRefresh) {
      const newToken = generateToken(tokenResult.openId);
      return success({
        token: newToken,
        refreshed: true
      });
    }

    return success({
      token: token,
      refreshed: false
    });
  } catch (err) {
    console.error('[appRefreshToken] error:', err);
    return error(500, err.message || "刷新Token失败");
  }
}

/**
 * 提交语言验证
 */
async function SubmitLanguageVerify(event) {
  try {
    const { openId, data, db } = event;
    
    if (!openId) {
      return error(401, "未登录");
    }

    const { voiceData, voiceDuration } = data || {};

    if (!voiceData || !voiceDuration) {
      return error(400, "缺少语音数据或时长");
    }

    // 上传语音到云存储
    const cloudPath = `verify_voice/${openId}_${Date.now()}.m4a`;
    const fileContent = Buffer.from(voiceData, 'base64');
    
    const uploadResult = await cloud.uploadFile({
      cloudPath,
      fileContent
    });

    // 创建验证帖子
    const verifyDyn = {
      openId,
      dynContent: "语音验证",
      dynVoice: uploadResult.fileID,
      dynVoiceLen: voiceDuration,
      verifyStatus: 1,
      circleId: "新人报到区",
      circleTitle: "新人报到区",
      createdAt: db.serverDate(),
      like: []
    };

    const dynResult = await db.collection('dyn').add({
      data: verifyDyn
    });

    // 更新用户状态为待验证
    await db.collection('user').where({ openId }).update({
      data: {
        joinStatus: 3
      }
    });

    return success({
      verifyId: dynResult._id,
      status: 0
    });
  } catch (err) {
    console.error('[appSubmitLanguageVerify] error:', err);
    return error(500, err.message || "提交验证失败");
  }
}

/**
 * 获取审核状态
 */
async function GetVerifyStatus(event) {
  try {
    const { openId, db } = event;
    
    if (!openId) {
      return error(401, "未登录");
    }

    // 查询用户状态
    const userResult = await db.collection('user').where({ openId }).get();
    if (userResult.data.length === 0) {
      return error(404, "用户不存在");
    }

    const user = userResult.data[0];
    const joinStatus = user.joinStatus;

    // 查询验证帖子 - 从 event 获取 _ 操作符
    const _ = event._ || db.command;
    const dynResult = await db.collection('dyn').where({
      openId,
      verifyStatus: _.in([1, 2])
    }).orderBy('createdAt', 'desc').limit(1).get();

    let verifyStatus = 0;
    let likeCount = 0;

    if (dynResult.data.length > 0) {
      const dyn = dynResult.data[0];
      likeCount = dyn.like ? dyn.like.length : 0;
      
      if (joinStatus === 1) {
        verifyStatus = 1;
      } else if (dyn.verifyStatus === 3) {
        verifyStatus = 2;
      }
    }

    return success({
      status: verifyStatus,
      joinStatus,
      likeCount,
      message: verifyStatus === 0 ? "审核中，需要3位用户充电" : (verifyStatus === 1 ? "审核通过" : "审核未通过")
    });
  } catch (err) {
    console.error('[appGetVerifyStatus] error:', err);
    return error(500, err.message || "获取审核状态失败");
  }
}

module.exports = {
  Login,
  GetUserInfo,
  RefreshToken,
  SubmitLanguageVerify,
  GetVerifyStatus
};
