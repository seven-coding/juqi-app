// 用户模块
// 版本: 2.2.0 - App测试环境专用（添加 cloud:// URL 转换支持）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');
const { convertDynListUrls, convertCloudUrlToHttps, convertCloudUrlsToHttps, isCloudUrl } = require('../utils/url');

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
    chargeCount: dyn.chargeNums || dyn.likeNums || 0, // dyn 文档无独立 chargeNums，每次点赞=1电量
    isLiked: isLiked,
    isCollected: false,
    isCharged: false,
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
  try {
    const { openId, data, db } = event;

    // 调用核心层：必须传 source: 'newApp'，否则 login 会用 getWXContext().OPENID 作为 ownOpenId；
    // 在 HTTP 触发的 appApi 链中无微信上下文，导致 ownOpenId 为空、isOwn 为 false，误走「查询他人」分支而失败。
    const result = await cloud.callFunction({
      name: 'login',
      data: {
        operation: 'getOwnInfo',
        source: 'newApp',
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appGetCurrentUserProfile] 核心层返回:', result.result);

    // login getOwnInfo 成功时返回 { openId, data: userInfo, publishCount }，无 code 字段；失败时返回 errorCode 或 getOtherInfo 错误
    const hasErrorCode = result.result && (result.result.code !== undefined && result.result.code !== 200);
    const hasData = result.result && (result.result.data != null || result.result.userInfo != null);
    if (hasErrorCode && !hasData) {
      return error(result.result.code || 500, result.result.message || '获取用户信息失败');
    }
    if (!hasData) {
      return error(500, (result.result && result.result.message) || '获取用户信息失败');
    }

    const userInfo = result.result.userInfo || result.result.data;
    
    console.log('[appGetCurrentUserProfile] userInfo 原始数据:', JSON.stringify(userInfo));

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
      // 必填字段（稳定用户 id：优先 _id，其次 openId）
      id: userInfo._id || userInfo.openId || openId,
      userName: userInfo.nickName || userInfo.userName || '未知用户',
      avatar: avatarUrl,
      isVip: !!isVip,
      followCount: toInt(userInfo.followCount || userInfo.followNums),
      followerCount: toInt(userInfo.followerCount || userInfo.fansNums),
      
      // 可选字段（与小程序/数据库字段一致）
      signature: userInfo.signature || null,
      level: toInt(userInfo.level || userInfo.levelNums),
      age: userInfo.age ? toInt(userInfo.age) : null,
      constellation: userInfo.constellation || null,
      city: userInfo.city || null,
      isFollowing: false,
      isCharged: false,
      chargeCount: toInt(userInfo.chargeNums),
      chargeNums: toInt(userInfo.chargeNums),
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
      
      // 统计数据
      publishCount: toInt(result.result.publishCount || userInfo.publishCount),
      collectionCount: toInt(userInfo.collectionCount),
      inviteCount: toInt(userInfo.inviteCount),
      blockedCount: toInt(userInfo.blockedCount)
    };

    console.log('[appGetCurrentUserProfile] 返回 profile:', JSON.stringify(profile));

    // iOS 期望响应在 data 对象中直接包含 profile
    return success(profile);
  } catch (err) {
    console.error('[appGetCurrentUserProfile] error:', err);
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
 * 将「用户 id」解析为 openId（支持 user 表 _id 或 openId）
 * 供需要调核心层（仅认 openId）的接口复用，便于未来无 openId 的注册方式。
 * @param {Object} db - 数据库实例
 * @param {string} userId - 用户 id（_id 或 openId）
 * @returns {Promise<string|null>} 解析出的 openId，无法解析时返回 null
 */
async function resolveUserIdToOpenId(db, userId) {
  if (!userId) return null;
  if (isMongoObjectId(userId)) {
    const res = await db.collection('user').doc(userId).get();
    return (res.data && res.data.openId) ? res.data.openId : null;
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
  try {
    const { openId: currentOpenId, data, db } = event;
    const requestUserId = (data || {}).userId;

    if (!requestUserId) {
      return error(400, "缺少用户ID");
    }

    // 0. 查看自己：客户端可能传 profile.id（_id 或 openId），先解析为 openId 再与当前用户比较
    const resolvedForSelf = await resolveUserIdToOpenId(db, requestUserId);
    if (resolvedForSelf === currentOpenId) {
      const selfEvent = { openId: currentOpenId, data, db };
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
        console.log('[appGetUserProfile] userId 为 _id，已解析出 openId');
      }
    }
    if (!userDoc) {
      const userInfoResult = await cloud.callFunction({
        name: 'commonRequest',
        data: { method: 'get_user_info', openId: requestUserId }
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
        name: 'commonRequest',
        data: { method: 'get_user_info', openId: resolvedOpenId }
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
          name: 'getUserAbout',
          data: {
            type: 7,
            source: 'newApp',
            openId: currentOpenId,
            ownOpenId: currentOpenId,
            AnyOpenId: resolvedOpenId
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
      chargingStatus: (userData.usersSecret && userData.usersSecret[0] && userData.usersSecret[0].chargingStatus) ?? null
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

    return success(profile);
  } catch (err) {
    console.error('[appGetUserProfile] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取用户动态列表
 * 核心层: getDynsListV2, type=4
 */
async function GetUserDynList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20, publicTime } = data || {};

    const targetOpenId = userId ? (await resolveUserIdToOpenId(db, userId) || userId) : openId;

    // 参数标准化
    const coreParams = {
      source: 'newApp', // 必须：让核心层使用 event.openId 而非 wxContext.OPENID
      openId: targetOpenId,
      ownOpenId: openId,
      type: 4, // 4=用户动态列表
      limit: limit
    };

    if (publicTime) {
      coreParams.publicTime = publicTime;
    }

    console.log('[appGetUserDynList] 调用核心层参数:', coreParams);

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams
    });

    console.log('[appGetUserDynList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取用户动态列表失败');
    }

    // 数据格式转换：将核心层返回的数据转换为App格式
    const rawDynList = result.result.dynList || [];
    const convertedList = rawDynList.map(dyn => convertDynToAppFormat(dyn, openId));
    
    // 转换 cloud:// URL 为 HTTPS URL
    const finalList = await convertDynListUrls(convertedList);
    
    return success({
      list: finalList,
      total: result.result.count || 0,
      hasMore: finalList.length >= limit,
      publicTime: result.result.publicTime
    });
  } catch (err) {
    console.error('[appGetUserDynList] error:', err);
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
      name: 'chargeHer',
      data: {
        chargeOpenId: chargeOpenId,
        openId: openId
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
      name: 'setUser',
      data: {
        type: 1, // 1=拉黑
        blackId: blackOpenId,
        openId: openId
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
      name: 'setUser',
      data: {
        type: 2, // 2=取消拉黑
        unBlackId: unBlackOpenId,
        openId: openId
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
    if (user.joinStatus !== 1) {
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
 */
async function GetUserList(event) {
  try {
    const { openId, data, db } = event;
    const { type, openId: targetUserId, page = 1, limit = 20 } = data || {};

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

    const users = usersResult.data.map(user => ({
      id: user.openId,
      userName: user.nickName || '未知用户',
      avatar: user.avatarVisitUrl || user.avatarUrl || null,
      signature: user.signature || null,
      isVip: user.usersSecret && user.usersSecret[0] && user.usersSecret[0].vipStatus || false
    }));

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
 */
async function UpdateUserInfo(event) {
  try {
    const { openId, data, db } = event;

    const updateData = {
      openId: openId
    };

    if (data.nickName !== undefined) updateData.nickName = data.nickName;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.birthDay !== undefined) updateData.birthDay = data.birthDay;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.signature !== undefined) updateData.signature = data.signature;
    if (data.gender !== undefined) updateData.gender = data.gender;

    console.log('[appUpdateUserInfo] 调用核心层参数:', updateData);

    const result = await cloud.callFunction({
      name: 'updateUserInfo',
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
    const { userId, page = 1, limit = 20 } = data || {};

    const targetOpenId = userId ? (await resolveUserIdToOpenId(db, userId) || userId) : openId;

    const result = await cloud.callFunction({
      name: 'getUserList',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 'charging',
        page: page,
        limit: limit
      }
    });

    console.log('[appGetChargeList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取充电列表失败');
    }

    return success({
      list: result.result.list || [],
      total: result.result.total || 0,
      hasMore: (result.result.list || []).length >= limit
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

    if (publicTime) {
      coreParams.publicTime = publicTime;
    }

    console.log('[appGetFavoriteList] 调用核心层参数:', coreParams);

    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams
    });

    console.log('[appGetFavoriteList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取收藏列表失败');
    }

    const dynList = result.result.dynList || [];
    return success({
      list: dynList,
      total: result.result.count || 0,
      hasMore: dynList.length >= limit,
      publicTime: result.result.publicTime
    });
  } catch (err) {
    console.error('[appGetFavoriteList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取黑名单列表
 * 核心层: getUserList, type='black'
 */
async function GetBlackList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20 } = data || {};

    const targetOpenId = userId ? (await resolveUserIdToOpenId(db, userId) || userId) : openId;

    const result = await cloud.callFunction({
      name: 'getUserList',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 'black',
        page: page,
        limit: limit
      }
    });

    console.log('[appGetBlackList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取黑名单失败');
    }

    return success({
      list: result.result.list || [],
      total: result.result.total || 0,
      hasMore: (result.result.list || []).length >= limit
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
      name: 'getUserList',
      data: {
        source: 'newApp',
        openId: openId,
        type: 'noVisit',
        page: page,
        limit: limit
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
      name: 'getUserList',
      data: { source: 'newApp', openId, type: 'nosee', page, limit }
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
      name: 'getUserList',
      data: { source: 'newApp', openId, type: 'nobesee', page, limit }
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
      name: 'getUserAbout',
      data: {
        type: 8,
        openId: openId,
        ownOpenId: openId
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
      name: 'getUserAbout',
      data: {
        type: 6,
        openId: openId,
        ownOpenId: openId
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
      name: 'updateUserInfo',
      data: {
        type: 'set_vip_config',
        source: 'newApp',
        openId: openId,
        showVisit: vipConfig.showVisit,
        showFollow: vipConfig.showFollow,
        showFollower: vipConfig.showFollower,
        showCharge: vipConfig.showCharge,
        restStatus: vipConfig.restStatus,
        cancelFollow: vipConfig.cancelFollow
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
      name: 'setUser',
      data: {
        type: 6,
        source: 'newApp',
        openId: openId,
        operateOpenId: targetOpenId,
        visitStatus: visitStatus
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
 * 用于个人主页「私聊」跳转：先拿到 chatId，客户端可据此跳转到消息或会话页
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

    if (existing.data && existing.data.length > 0) {
      return success({
        chatId: existing.data[0]._id,
        targetOpenId: targetOpenId
      });
    }

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
    const chatId = addRes._id || addRes.id;
    if (!chatId) {
      return error(500, "创建会话失败");
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
