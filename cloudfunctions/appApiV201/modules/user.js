// 用户模块
// 版本: 2.2.0 - App测试环境专用（添加 cloud:// URL 转换支持）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');
const { convertDynListUrls, convertCloudUrlToHttps, convertCloudUrlsToHttps, isCloudUrl } = require('../utils/url');
const { getFuncName } = require('../utils/env');

/** 根据出生日期计算年龄（与小程序 Calculator.getAge 一致，支持 yyyy-MM-dd / yyyy/mm/dd） */
function ageFromBirthDay(birthDay) {
  if (birthDay == null) return null;
  const str = typeof birthDay === 'object' && birthDay.toISOString ? birthDay.toISOString().slice(0, 10) : String(birthDay).trim();
  if (!str) return null;
  const parts = str.split(/[-/]/);
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const birth = new Date(y, m, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

/** 根据出生日期计算星座（与小程序 Calculator.getAstro 一致，返回中文如 魔羯、水瓶） */
function astroFromBirthDay(birthDay) {
  if (birthDay == null) return null;
  const str = typeof birthDay === 'object' && birthDay.toISOString ? birthDay.toISOString().slice(0, 10) : String(birthDay).trim();
  if (!str) return null;
  const parts = str.split(/[-/]/);
  if (parts.length < 3) return null;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day)) return null;
  const borders = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
  const names = ['魔羯', '水瓶', '双鱼', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '魔羯'];
  const idx = month - (day < borders[month - 1] ? 1 : 0);
  return names[idx] || null;
}

// 引入动态数据转换函数（从dyn模块）
// 注意：由于模块间不能直接引用，我们需要在这里重新定义或使用共享工具
// 为了简化，我们在这里定义一个简化版的转换函数
function convertDynToAppFormat(dyn, currentOpenId) {
  const userInfo = dyn.userInfo && Array.isArray(dyn.userInfo) ? dyn.userInfo[0] : (dyn.userInfo || {});
  
  let images = null;
  if (dyn.imageList && Array.isArray(dyn.imageList) && dyn.imageList.length > 0) {
    images = dyn.imageList;
  } else if (dyn.imageIds && Array.isArray(dyn.imageIds) && dyn.imageIds.length > 0) {
    images = dyn.imageIds;
  }
  
  let videoUrl = null;
  if (dyn.dynVideo) {
    videoUrl = Array.isArray(dyn.dynVideo) ? dyn.dynVideo[0] : dyn.dynVideo;
  }
  
  let musicInfo = null;
  if (dyn.musicId || dyn.musicName) {
    musicInfo = {
      musicId: dyn.musicId || null,
      musicName: dyn.musicName || null,
      musicAuthor: dyn.musicAuthor || null,
      musicPoster: dyn.musicPoster || null,
      musicSrc: dyn.musicSrc || null,
      isAudioShow: dyn.isAudioShow || false
    };
  }
  
  // 输出秒级时间戳，与 dyn 模块及客户端 .secondsSince1970 解码一致
  const rawTime = dyn.publicTime || dyn.createTime || Date.now();
  const ms = typeof rawTime === 'number' ? (rawTime < 1e12 ? rawTime * 1000 : rawTime) : new Date(rawTime).getTime();
  const publishTime = Math.floor(ms / 1000);

  // 判断是否已点赞（需要安全检查）
  const isLiked = dyn.like && Array.isArray(dyn.like) ? dyn.like.includes(currentOpenId) : false;
  
  // 处理ID字段：优先使用_id，如果没有则使用id
  const dynId = dyn._id || dyn.id || dyn.dynId || '';
  // 正文：与 dyn 模块一致，兼容小程序/历史数据（topic/ait 单独存储时拼接 # 与 @）
  const rawDynContent = dyn.dynContent || '';
  let content = rawDynContent;
  const isAppSource = dyn.source === 'newApp';
  if (!isAppSource) {
    const hasRichInContent = /#|@/.test(rawDynContent);
    if (!hasRichInContent) {
      const parts = [];
      if (dyn.topic && Array.isArray(dyn.topic) && dyn.topic.length > 0) {
        parts.push(dyn.topic.map(t => `#${t}#`).join(' '));
      }
      if (dyn.ait && Array.isArray(dyn.ait) && dyn.ait.length > 0) {
        parts.push(dyn.ait.map(a => {
          const name = (typeof a === 'object' && a && a.nickName) ? a.nickName : (typeof a === 'string' ? a : (a && a.openId));
          return name ? `@${name}` : '';
        }).filter(Boolean).join(' '));
      }
      if (parts.length) content = (content ? content + ' ' : '') + parts.join(' ');
    }
  }
  // id 与发帖时选择的用户 ID 一致（来自 dyn.ait），仅用 id 跳转
  const mentionedUsers = (dyn.ait && Array.isArray(dyn.ait))
    ? dyn.ait.map(a => {
        const id = typeof a === 'object' && a && (a.openId || a._id) ? (a.openId || a._id) : (typeof a === 'string' ? a : null);
        const userName = typeof a === 'object' && a && a.nickName ? a.nickName : (typeof a === 'string' ? a : '');
        return id ? { id, userName: userName || '' } : null;
      }).filter(Boolean)
    : [];
  
  // 个性签名：与小程序一致，小程序用 labels，数据库可能为 signature 或 labels
  const userSignature = (userInfo.signature && String(userInfo.signature).trim()) || (userInfo.labels && String(userInfo.labels).trim()) || null;

  return {
    id: dynId,
    userId: dyn.openId || userInfo.openId || '',
    userName: userInfo.nickName || '未知用户',
    userAvatar: userInfo.avatarVisitUrl || userInfo.avatarUrl || null,
    userSignature,
    isVip: userInfo.usersSecret && userInfo.usersSecret[0] && userInfo.usersSecret[0].vipStatus || false,
    content: content,
    mentionedUsers: mentionedUsers.length ? mentionedUsers : undefined,
    images: images,
    tag: null,
    publishTime: publishTime,
    commentCount: dyn.commentNums || 0,
    likeCount: dyn.likeNums || 0,
    shareCount: dyn.forwardNums || 0,
    chargeCount: dyn.chargeNums || dyn.likeNums || 0, // dyn 文档无独立 chargeNums，充电=点赞
    isLiked: isLiked,
    isCollected: false,
    isCharged: isLiked,   // 充电走点赞逻辑，已点赞即已充电
    repostPost: null,
    likeUsers: null,
    joinCount: null,
    circleId: dyn.circleId || null,
    circleTitle: dyn.circleTitle || null,
    circleJoinCount: null,
    voiceUrl: dyn.dynVoice || null,
    voiceDuration: dyn.dynVoiceLen || null,
    videoUrl: videoUrl,
    musicInfo: musicInfo,
    isPinned: !!(dyn.userTopTime > 0)
  };
}

/**
 * 获取当前用户信息
 * 核心层: login (getOwnInfo)
 */
async function GetCurrentUserProfile(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db } = event;
    console.log(`[reqId=${reqId}][appGetCurrentUserProfile] 入参: dataEnv=${event.dataEnv || '-'}, envId=${event.envId || '-'}`);

    // 调用核心层：必须传 source: 'newApp'，否则 login 会用 getWXContext().OPENID 作为 ownOpenId；
    // 在 HTTP 触发的 appApi 链中无微信上下文，导致 ownOpenId 为空、isOwn 为 false，误走「查询他人」分支而失败。
    const result = await cloud.callFunction({
      name: getFuncName('login'),
      data: {
        operation: 'getOwnInfo',
        source: 'newApp',
        openId: openId,
        ownOpenId: openId,
        requestId: event.requestId || ''
      }
    });

    // login getOwnInfo 成功时返回 { openId, data: userInfo, publishCount }，无 code 字段；失败时返回 errorCode 或 getOtherInfo 错误
    const hasErrorCode = result.result && (result.result.code !== undefined && result.result.code !== 200);
    const hasData = result.result && (result.result.data != null || result.result.userInfo != null);
    if (hasErrorCode && !hasData) {
      console.log(`[reqId=${reqId}][appGetCurrentUserProfile] 错误: code=${result.result.code || 500}, message=${result.result.message || '获取用户信息失败'}`);
      return error(result.result.code || 500, result.result.message || '获取用户信息失败');
    }
    if (!hasData) {
      console.log(`[reqId=${reqId}][appGetCurrentUserProfile] 错误: code=500, message=${(result.result && result.result.message) || '获取用户信息失败'}`);
      return error(500, (result.result && result.result.message) || '获取用户信息失败');
    }

    const userInfo = result.result.userInfo || result.result.data;

    // 稳定用户 id 与统计数据：有 db 时（prod 或 test）均用当前环境库做实时统计，保证与列表接口一致；dataEnv=prod 时另用生产库 _id 作为 profile.id。
    let stableUserId = userInfo._id || userInfo.openId || openId;
    const dataEnv = event.dataEnv || 'test';
    let statsOverrides = null; // 从当前环境 db 查得的统计，用于覆盖 login 返回值（关注/粉丝/发布/收藏/拉黑/邀请/电量）
    if (db) {
      try {
        const userRes = await db.collection('user').where({ openId }).limit(1).get();
        const currentUser = userRes.data && userRes.data.length > 0 ? userRes.data[0] : null;
        if (dataEnv === 'prod' && currentUser && currentUser._id) {
          stableUserId = currentUser._id;
          console.log(`[reqId=${reqId}][appGetCurrentUserProfile] dataEnv=prod，已用生产库 _id 作为 profile.id`);
        }
        // 关注数、粉丝数、发布数、收藏、拉黑：从当前环境库实时统计；电量、邀请数从 user 表取
        const [followCountRes, followerCountRes, publishCountRes, collectionCountRes, blockedCountRes] = await Promise.all([
          db.collection('user_followee').where({ openId, status: 1 }).count(),
          db.collection('user_followee').where({ followeeId: openId, status: 1 }).count(),
          db.collection('dyn').where({ openId }).count(),
          db.collection('dynFavorite').where({ openId, favoriteFlag: '0' }).count(),
          db.collection('user_black').where({ openId }).count()
        ]);
        statsOverrides = {
          followCount: followCountRes.total ?? 0,
          followerCount: followerCountRes.total ?? 0,
          publishCount: publishCountRes.total ?? (currentUser && (currentUser.dynNums ?? currentUser.publishCount)) ?? 0,
          collectionCount: collectionCountRes.total ?? (currentUser && currentUser.collectionCount) ?? 0,
          inviteCount: (currentUser && currentUser.inviteCount) ?? 0,
          blockedCount: blockedCountRes.total ?? (currentUser && currentUser.blockedCount) ?? 0,
          chargeNums: (currentUser && (currentUser.chargeNums != null)) ? (typeof currentUser.chargeNums === 'number' ? currentUser.chargeNums : parseInt(currentUser.chargeNums, 10) || 0) : undefined
        };
        if (statsOverrides.chargeNums === undefined) {
          delete statsOverrides.chargeNums;
        }
        console.log(`[reqId=${reqId}][appGetCurrentUserProfile] dataEnv=${dataEnv}，已从当前库填充统计:`, statsOverrides);
      } catch (e) {
        console.warn(`[reqId=${reqId}][appGetCurrentUserProfile] 查 user/统计失败，沿用 login 返回:`, e.message);
      }
    }

    // 转换头像 URL
    let avatarUrl = userInfo.avatarVisitUrl || userInfo.avatarUrl || null;
    if (avatarUrl && isCloudUrl(avatarUrl)) {
      avatarUrl = await convertCloudUrlToHttps(avatarUrl);
    }

    // 获取 VIP 状态
    const usersSecret = userInfo.usersSecret && userInfo.usersSecret[0] ? userInfo.usersSecret[0] : {};
    const isVip = usersSecret.vipStatus || userInfo.vipStatus || false;

    // 辅助函数：确保值是数字类型
    const toInt = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // 构建符合 iOS UserProfile 结构的响应
    // iOS 必填字段: id, userName, isVip, followCount, followerCount
    // id 使用稳定用户标识：优先 _id（与登录方式解耦，便于未来支持手机号/邮箱等无 openId 的注册）
    const profile = {
      // 必填字段（稳定用户 id：dataEnv=prod 时已用生产库 _id，否则 _id/openId）
      id: stableUserId,
      userName: userInfo.nickName || userInfo.userName || '未知用户',
      avatar: avatarUrl,
      isVip: !!isVip,
      followCount: statsOverrides ? statsOverrides.followCount : toInt(userInfo.followCount || userInfo.followNums),
      followerCount: statsOverrides ? statsOverrides.followerCount : toInt(userInfo.followerCount || userInfo.fansNums),
      
      // 可选字段（与小程序/数据库字段一致）
      signature: userInfo.signature || null,
      level: toInt(userInfo.level || userInfo.levelNums),
      age: userInfo.age ? toInt(userInfo.age) : null,
      constellation: userInfo.constellation || null,
      city: userInfo.city || null,
      isFollowing: false,
      isCharged: false,
      chargeCount: (statsOverrides && statsOverrides.chargeNums !== undefined) ? statsOverrides.chargeNums : toInt(userInfo.chargeNums),
      chargeNums: (statsOverrides && statsOverrides.chargeNums !== undefined) ? statsOverrides.chargeNums : toInt(userInfo.chargeNums),
      followStatus: toInt(userInfo.followStatus) || 1,
      chargingStatus: !!userInfo.chargingStatus,
      // iOS UserJoinStatus 枚举值: 1=normal, 2=pending, 3=pendingVoice, -1=deleted, -2=banned
      // 0 不是有效值，默认返回 1 (normal)
      joinStatus: toInt(userInfo.joinStatus) || 1,
      // iOS BlackStatus 枚举值: 1=normal, 2=blocked 等
      // 0 不是有效值，默认返回 1 (normal)
      blackStatus: toInt(userInfo.blackStatus) || 1,
      restStatus: !!userInfo.restStatus,
      vipStatus: !!isVip,
      vipConfig: usersSecret.vipConfig || userInfo.vipConfig || null,
      imgList: userInfo.imgList || userInfo.backgroundImg || null,
      bindUserInfo: userInfo.bindUserInfo || null,
      ownOpenId: openId,
      // 明确标记本人，避免客户端用 id/ownOpenId 比较时因 id 为生产库 _id 而误判
      isOwnProfile: true,

      // 统计数据（有 db 时已用当前环境库统计覆盖）
      publishCount: statsOverrides ? statsOverrides.publishCount : toInt(result.result.publishCount || userInfo.publishCount),
      collectionCount: statsOverrides ? statsOverrides.collectionCount : toInt(userInfo.collectionCount),
      inviteCount: statsOverrides ? statsOverrides.inviteCount : toInt(userInfo.inviteCount),
      blockedCount: statsOverrides ? statsOverrides.blockedCount : toInt(userInfo.blockedCount),
      // 当前用户是否为管理员（用于个人主页更多菜单是否展示管理入口）
      admin: !!(userInfo.auth && (userInfo.auth.admin || userInfo.auth.superAdmin || userInfo.auth.censor))
    };

    console.log(`[reqId=${reqId}][appGetCurrentUserProfile] 返回: code=200, profile.id=${profile.id}`);

    // iOS 期望响应在 data 对象中直接包含 profile
    return success(profile);
  } catch (err) {
    console.error(`[reqId=${reqId}][appGetCurrentUserProfile] 错误:`, err.message, err.stack);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 判断字符串是否为 MongoDB ObjectId 格式（24 位十六进制）
 */
function isMongoObjectId(str) {
  return typeof str === 'string' && /^[a-fA-F0-9]{24}$/.test(str);
}

/**
 * 判断是否为「类 _id」格式（24 或 32 位十六进制）。
 * 腾讯云/部分库用 32 位 hex 作为 _id，仅 24 位会漏掉导致按 openId 查 dyn 得 0 条。
 */
function isLikelyDocId(str) {
  return typeof str === 'string' && /^[a-fA-F0-9]{24}$/.test(str) || /^[a-fA-F0-9]{32}$/.test(str);
}

/**
 * 将「用户 id」解析为 openId（支持 user 表 _id 或 openId）
 * 供需要调核心层（仅认 openId）的接口复用，便于未来无 openId 的注册方式。
 * @param {Object} db - 数据库实例
 * @param {string} userId - 用户 id（_id 或 openId）
 * @returns {Promise<string|null>} 解析出的 openId，无法解析时返回 null
 */
async function resolveUserIdToOpenId(db, userId) {
  if (!userId) return null;
  if (isLikelyDocId(userId)) {
    try {
      const res = await db.collection('user').doc(userId).get();
      const openId = (res.data && res.data.openId) ? res.data.openId : null;
      if (openId) console.log('[resolveUserIdToOpenId] _id=', userId, '-> openId=', openId);
      return openId;
    } catch (e) {
      console.warn('[resolveUserIdToOpenId] doc.get 失败 userId=', userId, e.message);
      return null;
    }
  }
  return userId; // 视为 openId 直接返回
}

/**
 * 在 appApi 内用当前请求的 db 计算关注/拉黑/不可见（与 getUserAbout type=7 逻辑一致）。
 * dataEnv=prod 时 cloud.callFunction('getUserAbout') 会命中生产环境云函数（可能未部署修复版），
 * 因此用「当前 db（生产数据）+ 本函数」实现「测试环境函数逻辑 + 生产环境数据」。
 */
async function getOperateActionWithDb(db, _, openId, otherOpenId) {
  const iFollowHim = await db.collection('user_followee')
    .where({ openId, followeeId: otherOpenId, status: 1 })
    .get();
  const heFollowsMe = await db.collection('user_followee')
    .where({ openId: otherOpenId, followeeId: openId, status: 1 })
    .get();
  let followStatus = 1;
  if (iFollowHim.data.length > 0 && heFollowsMe.data.length > 0) followStatus = 4;
  else if (heFollowsMe.data.length > 0) followStatus = 3;
  else if (iFollowHim.data.length > 0) followStatus = 2;

  const iBlackHim = await db.collection('user_black').where({ openId, blackId: otherOpenId }).count();
  const heBlackMe = await db.collection('user_black').where({ openId: otherOpenId, blackId: openId }).count();
  const blackStatus = (iBlackHim.total > 0 || heBlackMe.total > 0) ? 2 : 1;

  let isInvisible = false;
  try {
    const noSeeRecord = (await db.collection('user_no_see').where(
      _.or([
        { openId, noSeeId: otherOpenId, type: 1 },
        { openId: otherOpenId, noSeeId: openId, type: 2 }
      ])
    ).get()).data;
    const herNoSee = noSeeRecord.some(item => item.type === 2) ? 1 : 0;
    isInvisible = herNoSee === 1;
  } catch (e) {
    console.log('[getOperateActionWithDb] user_no_see error:', e);
  }
  return { followStatus, blackStatus, isInvisible: !!isInvisible };
}

/**
 * 获取用户主页信息
 * 约定：入参 userId = 用户 id（支持 user 表 _id 或 openId）；内部按需解析为 openId 再调核心层。
 * 核心层: commonRequest (get_user_info) + getUserAbout (type=7)，均需 openId，故仅内部使用 openId。
 */
async function GetUserProfile(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId: currentOpenId, data, db } = event;
    const requestData = data || {};
    const requestUserId = requestData.userId;
    console.log(`[reqId=${reqId}][appGetUserProfile] 入参: userId=${requestUserId || '-'}, dataEnv=${event.dataEnv || '-'}`);
    const isSelf = requestData.isSelf === true;

    // 明确传 isSelf=true 时直接返回当前用户（避免 profile.id 为测试环境 _id 时在生产库解析失败 404）
    if (isSelf) {
      const selfEvent = { openId: currentOpenId, data: requestData, db, dataEnv: event.dataEnv, envId: event.envId, requestId: event.requestId };
      const selfResult = await GetCurrentUserProfile(selfEvent);
      if (selfResult.code !== 200) return selfResult;
      const selfProfile = selfResult.data;
      return success({
        ...selfProfile,
        followStatus: 1,
        blackStatus: selfProfile.blackStatus || 1,
        isInvisible: false
      });
    }

    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }

    // 0. 查看自己：客户端可能传 profile.id（_id 或 openId），先解析为 openId 再与当前用户比较
    const resolvedForSelf = await resolveUserIdToOpenId(db, requestUserId);
    if (resolvedForSelf === currentOpenId) {
      const selfEvent = { openId: currentOpenId, data, db, requestId: event.requestId };
      const selfResult = await GetCurrentUserProfile(selfEvent);
      if (selfResult.code !== 200) return selfResult;
      const selfProfile = selfResult.data;
      return success({
        ...selfProfile,
        followStatus: 1,
        blackStatus: selfProfile.blackStatus || 1,
        isInvisible: false
      });
    }

    // 1. 用「用户 id」解析出用户文档与 openId（支持 _id 或 openId，便于未来无 openId 的注册方式）
    let userDoc = null;
    let resolvedOpenId = null;
    let stableUserId = requestUserId;
    let resolvedByDocId = false;

    if (isMongoObjectId(requestUserId)) {
      const byIdRes = await db.collection('user').doc(requestUserId).get();
      if (byIdRes.data) {
        userDoc = byIdRes.data;
        resolvedOpenId = userDoc.openId;
        stableUserId = userDoc._id || requestUserId;
        resolvedByDocId = true;
        console.log(`[reqId=${reqId}][appGetUserProfile] userId 为 _id，已解析出 openId`);
      }
    }
    if (!userDoc) {
      const userInfoResult = await cloud.callFunction({
        name: getFuncName('commonRequest'),
        data: { method: 'get_user_info', openId: requestUserId, requestId: event.requestId || '' }
      });
      if (userInfoResult.result && userInfoResult.result !== '') {
        userDoc = userInfoResult.result;
        resolvedOpenId = userDoc.openId || requestUserId;
        stableUserId = userDoc._id || userDoc.openId || requestUserId;
      }
    }

    if (!userDoc || !resolvedOpenId) {
      return error(404, "用户不存在");
    }

    // 若由 _id 解析得到，再通过 commonRequest 拉完整信息（与 openId 路径结构一致，含 usersSecret 等）
    let userData = userDoc;
    if (resolvedByDocId) {
      const fullResult = await cloud.callFunction({
        name: getFuncName('commonRequest'),
        data: { method: 'get_user_info', openId: resolvedOpenId, requestId: event.requestId || '' }
      });
      if (fullResult.result && fullResult.result !== '') {
        userData = fullResult.result;
      }
    }

    // 2. 获取关注/拉黑关系（核心层需 openId）
    // 约定：dataEnv=prod 时用「当前 db（生产数据）」在 appApi 内算关系，不调用生产环境 getUserAbout（避免未部署修复版导致 userInfo 未定义）；
    // dataEnv=test 时调用测试环境 getUserAbout（测试环境函数 + 测试环境数据）。
    let followStatus = 1;
    let blackStatus = 1;
    let isInvisible = false;
    if (resolvedOpenId !== currentOpenId) {
      const dataEnv = event.dataEnv || 'test';
      if (dataEnv === 'prod') {
        const operate = await getOperateActionWithDb(db, event._ || db.command, currentOpenId, resolvedOpenId);
        followStatus = operate.followStatus;
        blackStatus = operate.blackStatus;
        isInvisible = operate.isInvisible;
      } else {
        const operateResult = await cloud.callFunction({
          name: getFuncName('getUserAbout'),
          data: {
            type: 7,
            source: 'newApp',
            openId: currentOpenId,
            ownOpenId: currentOpenId,
            AnyOpenId: resolvedOpenId,
            requestId: event.requestId || ''
          }
        });
        if (operateResult.result && operateResult.result.code === 200) {
          followStatus = operateResult.result.followStatus || 1;
          blackStatus = operateResult.result.blackStatus || 1;
          isInvisible = operateResult.result.isInvisible || false;
        }
      }
    }

    const fullUserResult = await db.collection('user').where({ openId: resolvedOpenId }).get();
    const fullUser = fullUserResult.data.length > 0 ? fullUserResult.data[0] : null;

    // 2.1 他人主页：当前用户是否已给该用户充电（今日），与 chargeHer 一致：messagesOther to=被充电人 from=充电人 type=1 chargeType=2
    let chargingStatus = null;
    if (resolvedOpenId !== currentOpenId) {
      try {
        const _ = db.command;
        const startOfToday = new Date(new Date().toLocaleDateString()).getTime();
        const chargeTodayRes = await db.collection('messagesOther').where({
          to: resolvedOpenId,
          from: currentOpenId,
          type: 1,
          chargeType: 2,
          createTime: _.gte(startOfToday)
        }).count();
        chargingStatus = (chargeTodayRes.total || 0) > 0;
      } catch (e) {
        console.warn('[appGetUserProfile] messagesOther 充电状态查询失败', e.message);
      }
    }

    // 3. 返回用稳定用户 id（优先 _id），与登录方式解耦；与客户端 UserProfile 解码一致：data 即 profile 对象（含 id、followCount、followerCount 等）
    // 个性签名、星座、地理位置：与小程序/数据库字段一致。小程序个性签名字段为 labels，星座为 xingzuo
    const signature = (userData.signature && String(userData.signature).trim()) || (userData.labels && String(userData.labels).trim()) || (fullUser?.signature && String(fullUser.signature).trim()) || (fullUser?.labels && String(fullUser.labels).trim()) || null;
    const city = (userData.city && String(userData.city).trim()) || (fullUser?.city && String(fullUser.city).trim()) || null;
    const constellation = (userData.constellation && String(userData.constellation).trim()) || (userData.xingzuo && String(userData.xingzuo).trim()) || (fullUser?.constellation && String(fullUser.constellation).trim()) || (fullUser?.xingzuo && String(fullUser.xingzuo).trim()) || null;
    const birthDayVal = userData.birthDay ?? fullUser?.birthDay;
    const computedAge = ageFromBirthDay(birthDayVal);
    const computedConstellation = astroFromBirthDay(birthDayVal);
    // 关注、粉丝数：小程序不存 user 表，由 user_followee 实时统计（与 login/operate.js 一致）
    const followCountRes = await db.collection('user_followee').where({ openId: resolvedOpenId, status: 1 }).count();
    const followerCountRes = await db.collection('user_followee').where({ followeeId: resolvedOpenId, status: 1 }).count();
    const followCountVal = followCountRes.total ?? 0;
    const followerCountVal = followerCountRes.total ?? 0;
    const publishCountVal = userData.dynNums ?? userData.publishCount ?? fullUser?.dynNums ?? fullUser?.publishCount ?? 0;
    const chargeCountVal = userData.chargeNums ?? userData.chargeCount ?? fullUser?.chargeNums ?? fullUser?.chargeCount ?? 0;

    const profile = {
      id: stableUserId,
      openId: userData.openId || resolvedOpenId,
      nickName: userData.nickName,
      userName: userData.nickName || userData.userName || '',
      avatar: userData.avatarVisitUrl || userData.avatarUrl || userData.avatar,
      city: city,
      birthDay: userData.birthDay,
      signature: signature,
      followStatus: followStatus,
      blackStatus: blackStatus,
      isInvisible: isInvisible,
      dynNums: userData.dynNums ?? fullUser?.dynNums ?? 0,
      followNums: followCountVal,
      fansNums: followerCountVal,
      chargeNums: userData.chargeNums ?? fullUser?.chargeNums ?? 0,
      joinStatus: fullUser ? fullUser.joinStatus : null,
      restStatus: false,
      // 客户端 UserProfile 所需字段（CodingKeys 一致）
      followCount: followCountVal,
      followerCount: followerCountVal,
      publishCount: publishCountVal,
      chargeCount: chargeCountVal,
      isVip: !!(userData.usersSecret && userData.usersSecret[0] && userData.usersSecret[0].vipStatus),
      ownOpenId: event.openId || null,
      level: (userData.usersSecret && userData.usersSecret[0] && userData.usersSecret[0].level) ?? null,
      age: userData.age ?? computedAge ?? null,
      constellation: constellation || computedConstellation || null,
      imgList: (userData.imgList && userData.imgList.length) ? userData.imgList : (fullUser && fullUser.imgList && fullUser.imgList.length) ? fullUser.imgList : null,
      collectionCount: userData.collectionCount ?? null,
      inviteCount: userData.inviteCount ?? null,
      blockedCount: userData.blockedCount ?? null,
      vipStatus: (userData.usersSecret && userData.usersSecret[0] && userData.usersSecret[0].vipStatus) ?? null,
      vipConfig: (userData.usersSecret && userData.usersSecret[0] && userData.usersSecret[0].vipConfig) ?? null,
      // 他人主页：由 messagesOther 实时查询「当前用户是否已给该用户充电（今日）」；本人或查询失败时用 usersSecret
      chargingStatus: chargingStatus !== null ? chargingStatus : ((userData.usersSecret && userData.usersSecret[0] && userData.usersSecret[0].chargingStatus) ?? null)
    };

    // 如果是自己的信息，返回会员状态和VIP配置
    if (resolvedOpenId === currentOpenId && userData.usersSecret && userData.usersSecret.length > 0) {
      profile.usersSecret = userData.usersSecret;
      if (userData.usersSecret[0].vipConfig && userData.usersSecret[0].vipConfig.restStatus !== undefined) {
        profile.restStatus = userData.usersSecret[0].vipConfig.restStatus;
      }
    }

    // 转换头像 cloud:// URL 为 HTTPS URL
    if (profile.avatar && isCloudUrl(profile.avatar)) {
      profile.avatar = await convertCloudUrlToHttps(profile.avatar);
    }
    // 转换资料图 imgList 的 cloud:// URL 为 HTTPS，避免 App 端前几张图加载失败
    if (profile.imgList && Array.isArray(profile.imgList) && profile.imgList.length > 0) {
      profile.imgList = await convertCloudUrlsToHttps(profile.imgList);
    }

    console.log(`[reqId=${reqId}][appGetUserProfile] 返回: code=200, profile.id=${profile.id}`);
    return success(profile);
  } catch (err) {
    console.error(`[reqId=${reqId}][appGetUserProfile] 错误:`, err.message, err.stack);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取用户动态列表
 * 核心层: getDynsListV2, type=4
 */
async function GetUserDynList(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20, publicTime } = data || {};
    console.log(`[reqId=${reqId}][appGetUserDynList] 入参: userId=${userId || '-'}, page=${page}, limit=${limit}, dataEnv=${event.dataEnv || '-'}`);

    const targetOpenId = userId ? (await resolveUserIdToOpenId(db, userId) || userId) : openId;
    console.log('[appGetUserDynList] resolveUserIdToOpenId 结果 userId=', userId, 'targetOpenId=', targetOpenId);

    // 参数标准化
    const coreParams = {
      source: 'newApp', // 必须：让核心层使用 event.openId 而非 wxContext.OPENID
      openId: targetOpenId,
      ownOpenId: openId,
      type: 4, // 4=用户动态列表
      limit: limit
    };
    if (event.envId) coreParams.envId = event.envId;
    if (publicTime) coreParams.publicTime = publicTime;
    coreParams.requestId = event.requestId || '';

    const result = await cloud.callFunction({
      name: getFuncName('getDynsListV2'),
      data: coreParams
    });

    if (result.result.code !== 200) {
      console.log(`[reqId=${reqId}][appGetUserDynList] 错误: code=${result.result.code || 500}, message=${result.result.message || '获取用户动态列表失败'}`);
      return error(result.result.code || 500, result.result.message || '获取用户动态列表失败');
    }

    // 数据格式转换：将核心层返回的数据转换为App格式
    const rawDynList = result.result.dynList || [];
    const convertedList = rawDynList.map(dyn => convertDynToAppFormat(dyn, openId));
    
    // 转换 cloud:// URL 为 HTTPS URL
    const finalList = await convertDynListUrls(convertedList);
    
    console.log(`[reqId=${reqId}][appGetUserDynList] 返回: code=200, listCount=${finalList.length}, hasMore=${finalList.length >= limit}`);
    return success({
      list: finalList,
      total: result.result.count || 0,
      hasMore: finalList.length >= limit,
      publicTime: result.result.publicTime
    });
  } catch (err) {
    console.error(`[reqId=${reqId}][appGetUserDynList] 错误:`, err.message, err.stack);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 给用户充电
 * 核心层: chargeHer
 */
async function ChargeUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data || {};

    if (!userId) {
      return error(400, "缺少用户ID");
    }

    const chargeOpenId = await resolveUserIdToOpenId(db, userId) || userId;
    if (chargeOpenId === openId) {
      return error(400, "不能给自己充电");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('chargeHer'),
      data: {
        chargeOpenId: chargeOpenId,
        openId: openId,
        requestId: event.requestId || ''
      }
    });

    console.log('[appChargeUser] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '充电失败');
    }

    return success({});
  } catch (err) {
    console.error('[appChargeUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 拉黑用户
 * 核心层: setUser, type=1
 */
async function BlackUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data || {};

    if (!userId) {
      return error(400, "缺少用户ID");
    }

    const blackOpenId = await resolveUserIdToOpenId(db, userId) || userId;
    if (blackOpenId === openId) {
      return error(400, "不能拉黑自己");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('setUser'),
      data: {
        type: 1, // 1=拉黑
        blackId: blackOpenId,
        openId: openId,
        requestId: event.requestId || ''
      }
    });

    console.log('[appBlackUser] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '拉黑失败');
    }

    return success({});
  } catch (err) {
    console.error('[appBlackUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 取消拉黑用户
 * 核心层: setUser, type=2
 */
async function UnblackUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data || {};

    if (!userId) {
      return error(400, "缺少用户ID");
    }

    const unBlackOpenId = await resolveUserIdToOpenId(db, userId) || userId;

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('setUser'),
      data: {
        type: 2, // 2=取消拉黑
        unBlackId: unBlackOpenId,
        openId: openId,
        requestId: event.requestId || ''
      }
    });

    console.log('[appUnblackUser] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '取消拉黑失败');
    }

    return success({});
  } catch (err) {
    console.error('[appUnblackUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 关注用户
 */
async function FollowUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId: requestUserId } = data || {};

    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }

    const followeeId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    if (openId === followeeId) {
      return error(400, "不能关注自己");
    }

    // 检查用户状态
    const userResult = await db.collection('user').where({ openId }).get();
    if (userResult.data.length === 0) {
      return error(404, "用户不存在");
    }
    const user = userResult.data[0];
    if (!event.bypassUserCheck && user.joinStatus !== 1) {
      return error(403, "用户未通过验证");
    }

    // 检查是否被拉黑
    const blackResult = await db.collection('blackList')
      .where({
        from: followeeId,
        to: openId,
        status: 1
      })
      .get();
    if (blackResult.data.length > 0) {
      return error(403, "你已被对方拉黑");
    }

    // 检查是否已关注
    const existingFollow = await db.collection('user_followee')
      .where({
        openId,
        followeeId,
        status: 1
      })
      .get();

    if (existingFollow.data.length > 0) {
      return error(400, "已关注该用户");
    }

    // 检查对方是否关注了我
    const beFollowedStatus = await db.collection('user_followee')
      .where({
        openId: followeeId,
        followeeId: openId,
        status: 1
      })
      .get();
    const isMutual = beFollowedStatus.data.length > 0;

    // 添加关注记录
    await db.collection('user_followee').add({
      data: {
        openId,
        followeeId,
        status: 1,
        createTime: new Date().valueOf(),
        ismutual: isMutual
      }
    });

    // 如果互相关注，更新对方的记录
    if (isMutual) {
      await db.collection('user_followee')
        .where({
          openId: followeeId,
          followeeId: openId,
          status: 1
        })
        .update({
          data: {
            ismutual: true
          }
        });
    }

    return success({});
  } catch (err) {
    console.error('[appFollowUser] error:', err);
    return error(500, err.message || "关注失败");
  }
}

/**
 * 取消关注用户
 */
async function UnfollowUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId: requestUserId } = data || {};

    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }

    const followeeId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;

    // 检查是否已关注
    const existingFollow = await db.collection('user_followee')
      .where({
        openId,
        followeeId,
        status: 1
      })
      .get();

    if (existingFollow.data.length === 0) {
      return error(400, "未关注该用户");
    }

    // 删除关注记录（标记为未关注）
    await db.collection('user_followee')
      .where({
        openId,
        followeeId,
        status: 1
      })
      .update({
        data: {
          status: 0
        }
      });

    // 如果之前是互相关注，更新对方的记录
    const beFollowedStatus = await db.collection('user_followee')
      .where({
        openId: followeeId,
        followeeId: openId,
        status: 1
      })
      .get();

    if (beFollowedStatus.data.length > 0) {
      await db.collection('user_followee')
        .where({
          openId: followeeId,
          followeeId: openId,
          status: 1
        })
        .update({
          data: {
            ismutual: false
          }
        });
    }

    return success({});
  } catch (err) {
    console.error('[appUnfollowUser] error:', err);
    return error(500, err.message || "取消关注失败");
  }
}

/**
 * 获取用户关注状态
 */
async function GetUserFollowStatus(event) {
  try {
    const { openId, data, db } = event;
    const { userId: requestUserId } = data || {};

    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }

    const otherUserId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    if (openId === otherUserId) {
      return success({
        followStatus: 0
      });
    }

    const iFollowHim = await db.collection('user_followee')
      .where({
        openId,
        followeeId: otherUserId,
        status: 1
      })
      .get();

    const heFollowsMe = await db.collection('user_followee')
      .where({
        openId: otherUserId,
        followeeId: openId,
        status: 1
      })
      .get();

    let followStatus;
    if (iFollowHim.data.length > 0 && heFollowsMe.data.length > 0) {
      followStatus = 4;
    } else if (heFollowsMe.data.length > 0) {
      followStatus = 3;
    } else if (iFollowHim.data.length > 0) {
      followStatus = 2;
    } else {
      followStatus = 1;
    }

    return success({
      followStatus
    });
  } catch (err) {
    console.error('[appGetUserFollowStatus] error:', err);
    return error(500, err.message || "获取关注状态失败");
  }
}

/**
 * 获取用户列表（关注/粉丝）
 * 使用 event.db 直查，dataEnv=prod 时由 index 初始化生产库，保证读线上数据
 */
async function GetUserList(event) {
  try {
    const { openId, data, db } = event;
    const { type, userId: dataUserId, openId: dataOpenId, page = 1, limit = 20 } = data || {};
    const targetUserId = dataUserId || dataOpenId;

    if (!targetUserId) {
      return error(400, "缺少用户ID");
    }

    const targetOpenId = await resolveUserIdToOpenId(db, targetUserId) || targetUserId;

    const skip = (page - 1) * limit;
    let query = {};
    let lookupField = '';

    if (type === 'follows' || type === 'follow') {
      query = {
        openId: targetOpenId,
        status: 1
      };
      lookupField = 'followeeId';
    } else if (type === 'followers' || type === 'follower') {
      query = {
        followeeId: targetOpenId,
        status: 1
      };
      lookupField = 'openId';
    } else if (type === 'charging') {
      return success({
        list: [],
        total: 0,
        hasMore: false
      });
    } else {
      return error(400, "无效的列表类型");
    }

    const followRecords = await db.collection('user_followee')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    if (followRecords.data.length === 0) {
      return success({
        list: [],
        total: 0,
        hasMore: false
      });
    }

    const userIds = followRecords.data.map(record => record[lookupField]);

    // 从 event 获取 _ 操作符
    const _ = event._ || db.command;
    const usersResult = await db.collection('user')
      .where({
        openId: _.in(userIds)
      })
      .get();

    const userMap = {};
    usersResult.data.forEach(user => {
      const sig = (user.signature && String(user.signature).trim()) || (user.labels && String(user.labels).trim()) || null;
      const vip = (user.usersSecret && user.usersSecret[0] && user.usersSecret[0].vipStatus) || user.vipStatus || false;
      userMap[user.openId] = {
        id: user.openId,
        userName: user.nickName || '未知用户',
        avatar: user.avatarVisitUrl || user.avatarUrl || null,
        signature: sig,
        isVip: !!vip
      };
    });
    // 按 followRecords 顺序（已 orderBy createTime desc）输出，保证「最新在最前」
    const users = userIds.map(id => userMap[id]).filter(Boolean);

    // 转换头像 cloud:// URL 为 HTTPS URL
    const avatarUrls = users.map(u => u.avatar).filter(url => isCloudUrl(url));
    if (avatarUrls.length > 0) {
      try {
        const urlResult = await cloud.getTempFileURL({ fileList: avatarUrls });
        const urlMap = {};
        if (urlResult.fileList) {
          urlResult.fileList.forEach(fileInfo => {
            if (fileInfo.status === 0 && fileInfo.tempFileURL) {
              urlMap[fileInfo.fileID] = fileInfo.tempFileURL;
            }
          });
        }
        users.forEach(u => {
          if (u.avatar && urlMap[u.avatar]) {
            u.avatar = urlMap[u.avatar];
          }
        });
      } catch (err) {
        console.warn('[appGetUserList] URL转换失败:', err.message);
      }
    }

    const totalResult = await db.collection('user_followee')
      .where(query)
      .count();
    const total = totalResult.total;

    return success({
      list: users,
      total: total,
      hasMore: skip + limit < total
    });
  } catch (err) {
    console.error('[appGetUserList] error:', err);
    return error(500, err.message || "获取用户列表失败");
  }
}

/**
 * 更新用户信息
 * 核心层: updateUserInfo
 * 客户端资料设置传 userName，此处映射为 nickName；头像传 avatar，核心层用 avatarUrl 生成访问 URL
 */
async function UpdateUserInfo(event) {
  try {
    const { openId, data, db } = event;

    const updateData = {
      source: 'newApp',
      openId: openId
    };

    // 资料设置页传 userName，与 nickName 二选一
    const nick = data.userName !== undefined ? data.userName : data.nickName;
    if (nick !== undefined) updateData.nickName = nick;
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
      // 核心层用 avatarUrl 生成 avatarVisitUrl（云存储临时链接）
      const avatarStr = Array.isArray(data.avatar) ? data.avatar[0] : data.avatar;
      if (avatarStr && typeof avatarStr === 'string' && avatarStr.includes('cloud')) {
        updateData.avatarUrl = avatarStr;
      }
    }
    if (data.birthDay !== undefined) updateData.birthDay = data.birthDay;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.signature !== undefined) updateData.signature = data.signature;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.constellation !== undefined) updateData.constellation = data.constellation;
    if (data.mbti !== undefined) updateData.mbti = data.mbti;
    if (data.relationshipStatus !== undefined) updateData.relationshipStatus = data.relationshipStatus;
    if (data.school !== undefined) updateData.school = data.school;
    if (data.imgList !== undefined) updateData.imgList = data.imgList;
    updateData.requestId = event.requestId || '';

    const result = await cloud.callFunction({
      name: getFuncName('updateUserInfo'),
      data: updateData
    });

    console.log('[appUpdateUserInfo] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '更新失败');
    }

    return success({});
  } catch (err) {
    console.error('[appUpdateUserInfo] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取充电列表
 * 核心层: getUserList, type='charging'
 */
async function GetChargeList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, openId: dataOpenId, page = 1, limit = 20 } = data || {};
    const targetUserId = userId || dataOpenId;

    const targetOpenId = targetUserId ? (await resolveUserIdToOpenId(db, targetUserId) || targetUserId) : openId;

    const result = await cloud.callFunction({
      name: getFuncName('getUserList'),
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 'charging',
        page: page,
        limit: limit,
        requestId: event.requestId || ''
      }
    });

    console.log('[appGetChargeList] 核心层返回:', result.result);

    if (result.result && result.result.code !== undefined && result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取充电列表失败');
    }

    // 核心层 getUserList/getCharging 返回 { userList, page, limit, count, type }，无 list 字段
    const rawList = result.result.userList || result.result.list || [];
    const total = result.result.count ?? result.result.total ?? 0;
    return success({
      list: rawList,
      total: total,
      hasMore: rawList.length >= limit
    });
  } catch (err) {
    console.error('[appGetChargeList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取收藏列表
 * 核心层: getDynsListV2, type=13
 */
async function GetFavoriteList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20, publicTime } = data || {};

    const targetOpenId = userId ? (await resolveUserIdToOpenId(db, userId) || userId) : openId;

    const coreParams = {
      source: 'newApp', // 必须：让核心层使用 event.openId 而非 wxContext.OPENID
      openId: targetOpenId,
      ownOpenId: openId,
      type: 13, // 13=收藏列表
      limit: limit
    };
    if (event.envId) coreParams.envId = event.envId;
    if (publicTime) coreParams.publicTime = publicTime;
    coreParams.requestId = event.requestId || '';

    const result = await cloud.callFunction({
      name: getFuncName('getDynsListV2'),
      data: coreParams
    });

    console.log('[appGetFavoriteList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取收藏列表失败');
    }

    // 与 GetUserDynList 一致：核心层返回原始 dyn，需转为 App 格式并转换 cloud:// URL
    const rawDynList = result.result.dynList || [];
    const convertedList = rawDynList.map(dyn => convertDynToAppFormat(dyn, openId));
    const finalList = await convertDynListUrls(convertedList);

    return success({
      list: finalList,
      total: result.result.count || 0,
      hasMore: finalList.length >= limit,
      publicTime: result.result.publicTime
    });
  } catch (err) {
    console.error('[appGetFavoriteList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取黑名单列表
 * 使用 event.db 直查，与 GetUserList 一致，保证 dataEnv=prod 时读生产库（不通过 callFunction 避免命中测试环境 getUserList）
 */
async function GetBlackList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, openId: dataOpenId, page = 1, limit = 20 } = data || {};
    const targetUserId = userId || dataOpenId;

    const targetOpenId = targetUserId ? (await resolveUserIdToOpenId(db, targetUserId) || targetUserId) : openId;

    const skip = (page - 1) * limit;

    // 总数
    const totalResult = await db.collection('user_black').where({ openId: targetOpenId }).count();
    const total = totalResult.total;

    const blackRecords = await db.collection('user_black')
      .where({ openId: targetOpenId })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    if (!blackRecords.data || blackRecords.data.length === 0) {
      return success({
        list: [],
        total: total,
        hasMore: false
      });
    }

    const blackIds = blackRecords.data.map(r => r.blackId);
    const _ = event._ || db.command;
    const usersResult = await db.collection('user')
      .where({ openId: _.in(blackIds) })
      .get();

    const blackUserMap = {};
    usersResult.data.forEach(user => {
      const sig = (user.signature && String(user.signature).trim()) || (user.labels && String(user.labels).trim()) || null;
      const vip = (user.usersSecret && user.usersSecret[0] && user.usersSecret[0].vipStatus) || user.vipStatus || false;
      blackUserMap[user.openId] = {
        id: user.openId,
        userName: user.nickName || '未知用户',
        avatar: user.avatarVisitUrl || user.avatarUrl || null,
        signature: sig,
        isVip: !!vip
      };
    });
    // 按 blackRecords 顺序（已 orderBy createTime desc）输出，最新在最前
    const users = blackIds.map(id => blackUserMap[id]).filter(Boolean);

    // 转换头像 cloud:// URL 为 HTTPS URL（与 GetUserList 一致）
    const avatarUrls = users.map(u => u.avatar).filter(url => isCloudUrl(url));
    if (avatarUrls.length > 0) {
      try {
        const urlResult = await cloud.getTempFileURL({ fileList: avatarUrls });
        const urlMap = {};
        if (urlResult.fileList) {
          urlResult.fileList.forEach(fileInfo => {
            if (fileInfo.status === 0 && fileInfo.tempFileURL) {
              urlMap[fileInfo.fileID] = fileInfo.tempFileURL;
            }
          });
        }
        users.forEach(u => {
          if (u.avatar && urlMap[u.avatar]) {
            u.avatar = urlMap[u.avatar];
          }
        });
      } catch (err) {
        console.warn('[appGetBlackList] URL转换失败:', err.message);
      }
    }

    return success({
      list: users,
      total: total,
      hasMore: skip + limit < total
    });
  } catch (err) {
    console.error('[appGetBlackList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取隐身访问列表（对哪些用户设置了不留下访客痕迹）
 * 核心层: getUserList, type='noVisit'
 */
async function GetNoVisitList(event) {
  try {
    const { openId, data } = event;
    const { page = 1, limit = 20 } = data || {};

    const result = await cloud.callFunction({
      name: getFuncName('getUserList'),
      data: {
        source: 'newApp',
        openId: openId,
        type: 'noVisit',
        page: page,
        limit: limit,
        requestId: event.requestId || ''
      }
    });

    const res = result.result;
    if (res && res.code !== 200) {
      return error(res.code || 500, res.message || '获取隐身访问列表失败');
    }
    const userList = res.userList || res.list || [];
    const count = res.count ?? res.total ?? 0;
    return success({
      list: userList,
      total: count,
      hasMore: userList.length >= limit
    });
  } catch (err) {
    console.error('[appGetNoVisitList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取「不看对方动态」列表
 * 核心层: getUserList, type='nosee'
 */
async function GetNoSeeList(event) {
  try {
    const { openId, data } = event;
    const { page = 1, limit = 20 } = data || {};
    const result = await cloud.callFunction({
      name: getFuncName('getUserList'),
      data: { source: 'newApp', openId, type: 'nosee', page, limit, requestId: event.requestId || '' }
    });
    const res = result.result;
    if (res && res.code !== 200) {
      return error(res.code || 500, res.message || '获取列表失败');
    }
    const userList = res.userList || res.list || [];
    return success({ list: userList, total: res.count ?? res.total ?? 0, hasMore: userList.length >= limit });
  } catch (err) {
    console.error('[appGetNoSeeList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取「不让对方看我动态」列表
 * 核心层: getUserList, type='nobesee'
 */
async function GetNoSeeMeList(event) {
  try {
    const { openId, data } = event;
    const { page = 1, limit = 20 } = data || {};
    const result = await cloud.callFunction({
      name: getFuncName('getUserList'),
      data: { source: 'newApp', openId, type: 'nobesee', page, limit, requestId: event.requestId || '' }
    });
    const res = result.result;
    if (res && res.code !== 200) {
      return error(res.code || 500, res.message || '获取列表失败');
    }
    const userList = res.userList || res.list || [];
    return success({ list: userList, total: res.count ?? res.total ?? 0, hasMore: userList.length >= limit });
  } catch (err) {
    console.error('[appGetNoSeeMeList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取邀请码
 * 核心层: getUserAbout, type=8
 */
async function GetInviteCode(event) {
  try {
    const { openId, data, db } = event;

    const result = await cloud.callFunction({
      name: getFuncName('getUserAbout'),
      data: {
        type: 8,
        openId: openId,
        ownOpenId: openId,
        requestId: event.requestId || ''
      }
    });

    console.log('[appGetInviteCode] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取邀请码失败');
    }

    const inviteCode = result.result.data || '';

    return success({ inviteCode });
  } catch (err) {
    console.error('[appGetInviteCode] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取邀请数量
 * 核心层: getUserAbout, type=6
 */
async function GetInviteCount(event) {
  try {
    const { openId, data, db } = event;

    const result = await cloud.callFunction({
      name: getFuncName('getUserAbout'),
      data: {
        type: 6,
        openId: openId,
        ownOpenId: openId,
        requestId: event.requestId || ''
      }
    });

    console.log('[appGetInviteCount] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取邀请数量失败');
    }

    const count = result.result.data?.inviteCount || 0;

    return success({ count });
  } catch (err) {
    console.error('[appGetInviteCount] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 更新VIP配置
 * 核心层: updateUserInfo, type=set_vip_config
 */
async function UpdateVipConfig(event) {
  try {
    const { openId, data } = event;
    const { vipConfig } = data || {};

    if (!vipConfig) {
      return error(400, "缺少VIP配置");
    }

    const result = await cloud.callFunction({
      name: getFuncName('updateUserInfo'),
      data: {
        type: 'set_vip_config',
        source: 'newApp',
        openId: openId,
        showVisit: vipConfig.showVisit,
        showFollow: vipConfig.showFollow,
        showFollower: vipConfig.showFollower,
        showCharge: vipConfig.showCharge,
        restStatus: vipConfig.restStatus,
        cancelFollow: vipConfig.cancelFollow,
        requestId: event.requestId || ''
      }
    });

    console.log('[appUpdateVipConfig] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '更新VIP配置失败');
    }

    return success({});
  } catch (err) {
    console.error('[appUpdateVipConfig] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 设置隐身访问（VIP）：对某用户访问时是否留下访客痕迹
 * 核心层: setUser, type=6 (setVisitStatus)
 * visitStatus: 0=留下痕迹，-1=不留下（隐身）
 */
async function SetVisitStatus(event) {
  try {
    const { openId, data, db } = event;
    const requestUserId = (data || {}).userId;
    const leaveTrace = (data || {}).leaveTrace !== false; // true=留下(0)，false=不留下(-1)
    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }
    const targetOpenId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    const visitStatus = leaveTrace ? 0 : -1;

    const result = await cloud.callFunction({
      name: getFuncName('setUser'),
      data: {
        type: 6,
        source: 'newApp',
        openId: openId,
        operateOpenId: targetOpenId,
        visitStatus: visitStatus,
        requestId: event.requestId || ''
      }
    });

    const res = result.result;
    if (res && res.code !== 200) {
      return error(res.code || 500, res.message || '设置失败');
    }
    return success({});
  } catch (err) {
    console.error('[appSetVisitStatus] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/** 管理员操作日志 type（与 setUserV201/config 一致） */
const LOG_ADMIN_TYPE = {
  SET_USER_BLACK: 19,
  SET_USER_STATUS: 20,
  LOGOUT: 21
};

/**
 * 获取当前用户权限（admin/superAdmin/censor），用于管理员接口校验
 */
async function getCurrentUserAuth(db, openId) {
  if (!openId) return null;
  const res = await db.collection('user').where({ openId }).limit(1).get();
  const user = (res.data && res.data[0]) ? res.data[0] : null;
  const auth = user && user.auth ? user.auth : {};
  return {
    admin: !!auth.admin,
    superAdmin: !!auth.superAdmin,
    censor: !!auth.censor
  };
}

/**
 * 设置用户状态（管理员）- 对应 setUser type=5
 * data: { userId, status }，status 为 joinStatus 枚举值（1 正常/2 待验证/3 待语音/-1 注销/-2 封禁）
 */
async function SetUserStatus(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db } = event;
    const _ = db.command;
    const requestUserId = (data || {}).userId;
    const status = (data || {}).status;
    if (requestUserId == null || status == null) {
      return error(400, '缺少 userId 或 status');
    }
    const auth = await getCurrentUserAuth(db, openId);
    if (!auth || (!auth.admin && !auth.superAdmin && !auth.censor)) {
      return error(403, '无权限执行此操作');
    }
    const targetOpenId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    await db.collection('user').where({ openId: targetOpenId }).update({
      data: { joinStatus: status }
    });
    await db.collection('log_admin').add({
      data: {
        openId: targetOpenId,
        operator: openId,
        joinStatus: status,
        createTime: Date.now(),
        type: LOG_ADMIN_TYPE.SET_USER_STATUS
      }
    });
    console.log(`[reqId=${reqId}][appSetUserStatus] 成功 targetOpenId=${targetOpenId} status=${status}`);
    return success({});
  } catch (err) {
    console.error('[appSetUserStatus] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取用户操作记录（管理员）- 查 log_admin，type 14/19/20/21
 * data: { userId }
 * 返回 { data: [ { id, type, reason, createTime, content } ] }
 */
async function GetUserActionHistory(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db } = event;
    const _ = db.command;
    const requestUserId = (data || {}).userId;
    if (!requestUserId) return error(400, '缺少 userId');
    const auth = await getCurrentUserAuth(db, openId);
    if (!auth || (!auth.admin && !auth.superAdmin && !auth.censor)) {
      return error(403, '无权限执行此操作');
    }
    const targetOpenId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    const res = await db.collection('log_admin')
      .where({ openId: targetOpenId, type: _.in([14, 19, 20, 21]) })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get();
    const actionTypeMap = { 14: '封禁', 19: '封禁', 20: '设置状态', 21: '注销' };
    const list = (res.data || []).map((item) => ({
      id: item._id != null ? String(item._id) : '',
      type: item.type || 0,
      reason: item.reason || item.blackReason || '',
      createTime: item.createTime || 0,
      content: actionTypeMap[item.type] || '操作'
    }));
    console.log(`[reqId=${reqId}][appGetUserActionHistory] 成功 targetOpenId=${targetOpenId} count=${list.length}`);
    return success(list);
  } catch (err) {
    console.error('[appGetUserActionHistory] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 设置用户标签（管理员）- 对应 setUser type=7
 * data: { userId, auth }，auth 为 { verifier?, admin?, superAdmin?, censor? }
 */
async function SetUserAuth(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db } = event;
    const requestUserId = (data || {}).userId;
    const newAuth = (data || {}).auth;
    if (!requestUserId || !newAuth || typeof newAuth !== 'object') {
      return error(400, '缺少 userId 或 auth');
    }
    const auth = await getCurrentUserAuth(db, openId);
    if (!auth || (!auth.admin && !auth.superAdmin && !auth.censor)) {
      return error(403, '无权限执行此操作');
    }
    const targetOpenId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    const userRes = await db.collection('user').where({ openId: targetOpenId }).limit(1).get();
    const currentUser = (userRes.data && userRes.data[0]) ? userRes.data[0] : null;
    if (!currentUser) return error(404, '用户不存在');
    const currentAuth = currentUser.auth || {};
    const mergedAuth = { ...currentAuth, ...newAuth };
    await db.collection('user').where({ openId: targetOpenId }).update({
      data: { auth: mergedAuth }
    });
    await db.collection('log_admin').add({
      data: {
        openId: targetOpenId,
        operator: openId,
        createTime: Date.now(),
        type: 7,
        newAuth: mergedAuth
      }
    });
    console.log(`[reqId=${reqId}][appSetUserAuth] 成功 targetOpenId=${targetOpenId}`);
    return success({});
  } catch (err) {
    console.error('[appSetUserAuth] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 记录访问他人主页（访客痕迹，与小程序 setVisitMsg 一致）
 * 写入 messagesOther type=3，用于「最近来访」等
 */
async function RecordVisit(event) {
  try {
    const { openId: currentOpenId, data, db } = event;
    const _ = db.command;
    const requestUserId = (data || {}).userId;
    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }
    const targetOpenId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    if (targetOpenId === currentOpenId) {
      return success({}); // 访问自己不计
    }

    const existing = await db.collection('messagesOther').where({
      from: currentOpenId,
      to: targetOpenId,
      type: 3
    }).get();

    const now = Date.now();
    if (existing.data && existing.data.length > 0) {
      await db.collection('messagesOther').doc(existing.data[0]._id).update({
        data: {
          createTime: now,
          status: 0,
          visitNums: _.inc(1)
        }
      });
    } else {
      await db.collection('messagesOther').add({
        data: {
          from: currentOpenId,
          to: targetOpenId,
          type: 3,
          createTime: now,
          status: 0,
          visitNums: 1
        }
      });
    }
    return success({});
  } catch (err) {
    console.error('[appRecordVisit] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取或创建与目标用户的私聊会话 ID
 * 用于个人主页「私聊」跳转：先拿到 chatId，客户端可据此跳转到消息或会话页。
 * 同时确保 messagesType 存在一条记录（to=当前用户, from=对方），这样消息首屏会显示该对话入口。
 */
async function GetChatId(event) {
  try {
    const { openId: currentOpenId, data, db } = event;
    const _ = db.command;
    const requestUserId = (data || {}).userId;
    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }
    const targetOpenId = await resolveUserIdToOpenId(db, requestUserId) || requestUserId;
    if (targetOpenId === currentOpenId) {
      return error(400, "不能与自己私聊");
    }

    const existing = await db.collection('chatIds').where(_.or([
      { from: currentOpenId, to: targetOpenId, status: 1, type: 1 },
      { from: targetOpenId, to: currentOpenId, status: 1, type: 1 }
    ])).get();

    let chatId;
    if (existing.data && existing.data.length > 0) {
      chatId = existing.data[0]._id;
    } else {
      const addRes = await db.collection('chatIds').add({
        data: {
          from: currentOpenId,
          to: targetOpenId,
          status: 1,
          type: 1,
          createTime: (typeof db.serverDate === 'function') ? db.serverDate() : new Date(),
          updateTime: (typeof db.serverDate === 'function') ? db.serverDate() : new Date()
        }
      });
      chatId = addRes._id || addRes.id;
      if (!chatId) {
        return error(500, "创建会话失败");
      }
    }

    // 确保 messagesType 存在一条 to=当前用户、from=对方的记录，消息首屏（getMessagesUser）才能显示该对话入口
    const now = Date.now();
    const targetUserRes = await db.collection('user').where({ openId: targetOpenId }).limit(1).get();
    const targetUser = (targetUserRes.data && targetUserRes.data[0]) || {};
    const fromName = targetUser.nickName ?? '';
    const fromPhoto = targetUser.avatarVisitUrl ?? targetUser.avatarUrl ?? null;

    const typeRow = await db.collection('messagesType').where({
      to: currentOpenId,
      from: targetOpenId,
      groupType: targetOpenId,
      status: _.in([0, 1])
    }).get();

    if (typeRow.data && typeRow.data.length > 0) {
      await db.collection('messagesType').where({
        to: currentOpenId,
        from: targetOpenId,
        groupType: targetOpenId,
        status: _.in([0, 1])
      }).update({
        data: {
          chatId: chatId,
          createTime: now,
          fromName,
          fromPhoto,
          message: typeRow.data[0].message || '发消息'
        }
      });
    } else {
      await db.collection('messagesType').add({
        data: {
          from: targetOpenId,
          to: currentOpenId,
          groupType: targetOpenId,
          status: 1,
          noReadCount: 0,
          createTime: now,
          messageUserId: null,
          type: 20,
          fromName,
          fromPhoto,
          message: '发消息',
          chatId
        }
      });
    }

    return success({
      chatId: chatId,
      targetOpenId: targetOpenId
    });
  } catch (err) {
    console.error('[appGetChatId] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

module.exports = {
  GetCurrentUserProfile,
  GetUserProfile,
  GetUserDynList,
  ChargeUser,
  BlackUser,
  UnblackUser,
  FollowUser,
  UnfollowUser,
  GetUserFollowStatus,
  GetUserList,
  GetChatId,
  RecordVisit,
  SetVisitStatus,
  SetUserStatus,
  GetUserActionHistory,
  SetUserAuth,
  UpdateUserInfo,
  GetChargeList,
  GetFavoriteList,
  GetBlackList,
  GetNoVisitList,
  GetNoSeeList,
  GetNoSeeMeList,
  GetInviteCode,
  GetInviteCount,
  UpdateVipConfig
};
