// 动态模块
// 版本: 2.2.0 - App测试环境专用（添加 cloud:// URL 转换支持）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');
const { convertDynListUrls, convertDynUrls, convertCommentUrls } = require('../utils/url');

/**
 * 将核心层返回的动态数据转换为App格式
 * @param {Object} dyn - 核心层返回的动态数据
 * @param {String} currentOpenId - 当前登录用户的openId
 * @returns {Object} App格式的动态数据
 */
function convertDynToAppFormat(dyn, currentOpenId) {
  const rawUserInfo = dyn.userInfo && Array.isArray(dyn.userInfo) ? dyn.userInfo[0] : dyn.userInfo;
  const userInfo = rawUserInfo && typeof rawUserInfo === 'object' ? rawUserInfo : {};
  const userSecret = (dyn.userSecret && Array.isArray(dyn.userSecret) ? dyn.userSecret[0] : null) || (userInfo.usersSecret && userInfo.usersSecret[0]);
  
  // 处理图片列表
  let images = null;
  if (dyn.imageList && Array.isArray(dyn.imageList) && dyn.imageList.length > 0) {
    images = dyn.imageList;
  } else if (dyn.imageIds && Array.isArray(dyn.imageIds) && dyn.imageIds.length > 0) {
    images = dyn.imageIds;
  } else if (dyn.imagePath) {
    images = [dyn.imagePath];
  }
  
  // 处理视频URL
  let videoUrl = null;
  if (dyn.dynVideo) {
    if (Array.isArray(dyn.dynVideo)) {
      videoUrl = dyn.dynVideo[0] || null;
    } else {
      videoUrl = dyn.dynVideo;
    }
  }
  
  // 处理音乐信息
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
  
  // 处理转发信息
  let repostPost = null;
  if (dyn.forwardInfo) {
    const forwardUserInfo = dyn.forwardInfo.userInfo && Array.isArray(dyn.forwardInfo.userInfo) 
      ? dyn.forwardInfo.userInfo[0] 
      : (dyn.forwardInfo.userInfo || {});
    
    repostPost = {
      id: dyn.forwardDynId || dyn._id,
      userId: dyn.forwardInfo.openId || null,
      userName: forwardUserInfo.nickName || '未知用户',
      userAvatar: forwardUserInfo.avatarVisitUrl || forwardUserInfo.avatarUrl || null,
      content: dyn.forwardInfo.dynContent || '',
      images: dyn.forwardInfo.imageList || dyn.forwardInfo.imageIds || null
    };
  }
  
  // 判断是否已点赞（必须为 boolean，避免 JSON 序列化时省略 undefined 导致客户端解码失败）
  const isLiked = !!(dyn.like && Array.isArray(dyn.like) && dyn.like.includes(currentOpenId));
  
  // 将各种格式的时间值转为秒级时间戳（Unix epoch）
  // 兼容：数字(秒/毫秒)、Date对象、ISO字符串、云数据库序列化格式 {$date: value}
  // 注意：不能简单用 >1e12 区分秒/毫秒，因为 2001 年前的毫秒时间戳 < 1e12 会被误判
  const REASONABLE_SEC_MIN = 946684800;   // 2000-01-01 UTC（秒）
  const REASONABLE_SEC_MAX = 4102444800;  // 2100-01-01 UTC（秒）
  function toSecondsTimestamp(value) {
    if (value == null) return Math.floor(Date.now() / 1000);
    
    // 云数据库序列化格式：{$date: ms} 或 {$date: "ISO string"}
    if (typeof value === 'object' && value !== null && value.$date != null) {
      return toSecondsTimestamp(value.$date);
    }
    
    // Date 对象（同一运行时内才有效）
    if (value instanceof Date && !isNaN(value.getTime())) {
      return Math.floor(value.getTime() / 1000);
    }
    
    // 数字：先试当秒看是否在合理区间(2000~2100)，再试当毫秒
    if (typeof value === 'number' && isFinite(value)) {
      // 当秒解读是否合理
      if (value >= REASONABLE_SEC_MIN && value <= REASONABLE_SEC_MAX) {
        return Math.floor(value);
      }
      // 当毫秒解读是否合理
      const asSec = Math.floor(value / 1000);
      if (asSec >= REASONABLE_SEC_MIN && asSec <= REASONABLE_SEC_MAX) {
        return asSec;
      }
      // 都不合理：返回当前时间
      return Math.floor(Date.now() / 1000);
    }
    
    // 字符串（ISO格式 或 数字字符串）
    if (typeof value === 'string') {
      const num = Number(value);
      if (!isNaN(num) && isFinite(num)) return toSecondsTimestamp(num);
      const d = new Date(value);
      if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
    }
    
    return Math.floor(Date.now() / 1000); // 兜底：当前时间
  }
  
  const rawTime = dyn.publicTime || dyn.createTime || dyn.serverDate;
  let publishTimestamp = toSecondsTimestamp(rawTime);
  // 若 publicTime 解析结果仍不合理，用 createTime/serverDate 兜底
  const nowSec = Math.floor(Date.now() / 1000);
  if (publishTimestamp < REASONABLE_SEC_MIN || publishTimestamp > nowSec + 86400 * 2) {
    const fromCreate = toSecondsTimestamp(dyn.createTime);
    const fromServer = toSecondsTimestamp(dyn.serverDate);
    if (fromCreate >= REASONABLE_SEC_MIN && fromCreate <= nowSec + 86400) publishTimestamp = fromCreate;
    else if (fromServer >= REASONABLE_SEC_MIN && fromServer <= nowSec + 86400) publishTimestamp = fromServer;
    // 若全都不合理，publishTimestamp 已被 toSecondsTimestamp 兜底为当前时间
  }
  console.log('[time-debug] dynId:', (dyn._id||'').slice(0,8), 'rawTime:', typeof rawTime, String(rawTime).slice(0,30), '→ publishTimestamp:', publishTimestamp);

  // 处理ID字段：优先使用_id，如果没有则使用id
  const dynId = dyn._id || dyn.id || dyn.dynId || '';
  
  // 兼容两种发布来源：App 发布不拼接，小程序发布需用 topic/ait 拼接
  const rawDynContent = dyn.dynContent || '';
  let content = rawDynContent;
  const isAppSource = dyn.source === 'newApp';
    if (!isAppSource) {
    // 小程序或历史数据：若正文已含 #/@ 则直接用，否则用 topic/ait 拼接
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

  // 正文 @ 列表：id 与发帖时选择的用户 ID 一致（来自 dyn.ait），仅用 id 跳转，不兼容昵称
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
    isVip: Boolean((userSecret && userSecret.vipStatus) || (userInfo.usersSecret && userInfo.usersSecret[0] && userInfo.usersSecret[0].vipStatus)),
    content,
    mentionedUsers: mentionedUsers.length ? mentionedUsers : undefined,
    images: images,
    tag: null, // 标签需要从其他字段推导，暂时为null
    publishTime: publishTimestamp, // 秒级时间戳（Unix epoch），客户端用 .secondsSince1970 解码
    commentCount: dyn.commentNums || 0,
    likeCount: dyn.likeNums || 0,
    shareCount: dyn.forwardNums || 0,
    chargeCount: dyn.chargeNums || dyn.likeNums || 0, // dyn 文档无独立 chargeNums，每次点赞=1电量，等于 likeNums
    isLiked: Boolean(isLiked),
    isCollected: dyn.favoriteFlag === '0',   // 0=已收藏，1=未收藏
    isCharged: false,   // 需要额外查询充电状态
    repostPost: repostPost,
    likeUsers: (dyn.like && Array.isArray(dyn.like) && dyn.like.length > 0)
      ? dyn.like.map(u => ({
          id: u.openId || u._id || u.id || '',
          userName: u.nickName || u.userName || '',
          avatar: u.avatarVisitUrl || u.avatarUrl || u.avatar || null
        })).filter(u => u.id)
      : null,
    joinCount: null,    // 需要额外查询参与记录数
    circleId: dyn.circleId || null,
    circleTitle: (dyn.circleInfo && dyn.circleInfo[0]) ? dyn.circleInfo[0].title : (dyn.circleTitle || null),
    circleJoinCount: (dyn.circleInfo && dyn.circleInfo[0] && dyn.circleInfo[0].followCircleNums != null) ? dyn.circleInfo[0].followCircleNums : null,
    voiceUrl: dyn.dynVoice || null,
    voiceDuration: dyn.dynVoiceLen || null,
    videoUrl: videoUrl,
    musicInfo: musicInfo,
    isPinned: !!(dyn.userTopTime > 0)
  };
}

/**
 * 将各种格式的时间值转为毫秒级时间戳（用于游标 publicTime，需与数据库 Date 字段对齐）
 */
function toMillisTimestamp(value) {
  if (value == null) return null;
  // {$date: ms}
  if (typeof value === 'object' && value !== null && value.$date != null) {
    return toMillisTimestamp(value.$date);
  }
  // Date 对象
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.getTime();
  }
  // 数字：判断是秒还是毫秒
  if (typeof value === 'number' && isFinite(value)) {
    const REASONABLE_MS_MIN = 946684800000;   // 2000-01-01 UTC (ms)
    const REASONABLE_MS_MAX = 4102444800000;  // 2100-01-01 UTC (ms)
    // 先当毫秒看
    if (value >= REASONABLE_MS_MIN && value <= REASONABLE_MS_MAX) return Math.floor(value);
    // 再当秒看
    const asMs = Math.floor(value * 1000);
    if (asMs >= REASONABLE_MS_MIN && asMs <= REASONABLE_MS_MAX) return asMs;
    return Math.floor(value);  // 原样返回
  }
  // 字符串
  if (typeof value === 'string') {
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) return toMillisTimestamp(num);
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return null;
}

/**
 * 获取动态列表
 * 核心层: getDynsListV2
 * type映射: 'all'->2, 'follow'->6, 'circle'->1, 'topic'->5, 'announcement'->99, 'hot'->10, 'talent'->2
 */
async function GetDynList(event) {
  try {
    const { openId, data, db } = event;
    const { type, page = 1, limit = 20, circleId, topic, publicTime } = data || {};

    // type参数映射：将App的字符串类型转换为数字（与 getDynsListV2 核心层一致）
    const typeMap = {
      'all': 2,           // 广场/最新动态
      'follow': 6,        // 关注动态
      'circle': 1,        // 圈子动态
      'topic': 5,         // 话题动态
      'announcement': 99, // 公告板（管理员动态）
      'hot': 10,          // 热榜
      'talent': 1,        // 姬圈才艺大赛（特定圈子动态）
      'talentHot': 15,    // 姬圈才艺大赛-热度榜（按充电数排序）
      'verify': -1        // 新手区（使用 verifyStatus，type 会被忽略）
    };

    const coreType = typeof type === 'string' ? typeMap[type] : type;

    if (coreType == null) {
      return error(400, "缺少type参数或type参数无效");
    }

    // 参数标准化
    // 1. source='newApp' 必须传给核心层，否则生产环境的核心函数会走 wxContext.OPENID 分支
    //    （跨环境 callFunction 时 wxContext 为空，导致 dealBlackDyn/getNoSeeList 报 undefined 错误）
    // 2. openId/ownOpenId 不为 undefined，避免 .where({openId: undefined}) 报错
    const safeOpenId = openId != null && openId !== '' ? openId : '';
    const coreParams = {
      source: 'newApp', // 必须：让核心层使用 event.openId 而非 wxContext.OPENID
      openId: safeOpenId,
      ownOpenId: safeOpenId,
      type: coreType,  // 数字类型
      limit: limit
    };
    if (event.envId) coreParams.envId = event.envId;

    // 分页参数处理
    if (publicTime) {
      coreParams.publicTime = publicTime;
    }

    // 根据type添加特定参数
    if (coreType === 1 && circleId) {
      coreParams.circleId = circleId;
    }
    if (coreType === 5 && topic) {
      coreParams.topic = topic;
    }

    // 才艺大赛：固定圈子ID（与小程序 circles-list 组件一致）
    if (type === 'talent' || type === 'talentHot') {
      coreParams.circleId = '71fb15f966727610032a1ec01d133f93';
    }

    // 新手区：使用 verifyStatus 参数（核心层优先检查 verifyStatus，忽略 type）
    if (type === 'verify') {
      coreParams.verifyStatus = true;
    }

    console.log('[appGetDynList v2.2.0] 调用核心层参数:', JSON.stringify(coreParams), '- envId:', coreParams.envId || '未设置');

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams
    });

    console.log('[appGetDynList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取动态列表失败');
    }

    // 数据格式转换：将核心层返回的数据转换为App格式
    const rawDynList = result.result.dynList || [];
    const convertedList = rawDynList.map(dyn => convertDynToAppFormat(dyn, openId));
    
    // 转换 cloud:// URL 为 HTTPS URL（iOS 不支持 cloud:// 协议）
    const finalList = await convertDynListUrls(convertedList);
    
    // 将 publicTime 游标统一转为毫秒级时间戳（数据库 Date 字段使用毫秒比较）
    // 核心层返回的 publicTime 可能是 Date 对象、{$date: ms}、ISO 字符串或数字(秒/毫秒)
    let rawPublicTime = result.result.publicTime;
    let cursorTime = null;
    if (rawPublicTime != null) {
      cursorTime = toMillisTimestamp(rawPublicTime);
    }
    console.log('[cursor-debug] rawPublicTime:', typeof rawPublicTime, String(rawPublicTime).slice(0,30), '→ cursorTime:', cursorTime);

    return success({
      list: finalList,
      total: result.result.count || 0,
      hasMore: finalList.length >= limit,
      publicTime: cursorTime  // 数字时间戳，用于下次分页游标
    });
  } catch (err) {
    console.error('[appGetDynList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取动态详情
 * 核心层: getDynDetail
 */
async function GetDynDetail(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data || {};

    if (!id) {
      return error(400, "缺少动态ID");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynDetail',
      data: {
        id: id,
        openId: openId,
        ownOpenId: openId,
        source: 'newApp' // 标识 App 调用，使核心层使用 event.openId 而非 wxContext.OPENID
      }
    });

    console.log('[appGetDynDetail] 核心层返回:', JSON.stringify(result.result));

    // 核心层返回格式兼容：
    // - 成功时返回 {openId, data} 或 {code: 200, data}（无统一 code 字段）
    // - 失败时返回 {error, code, message}
    const coreResult = result.result || {};
    if (coreResult.error || (coreResult.code && coreResult.code !== 200)) {
      return error(coreResult.code || 500, coreResult.message || '获取动态详情失败');
    }

    // 数据格式转换：将核心层返回的数据转换为App格式
    const rawDyn = coreResult.data || coreResult.dyn || coreResult;
    const convertedDyn = convertDynToAppFormat(rawDyn, openId);
    
    // 转换 cloud:// URL 为 HTTPS URL（iOS 不支持 cloud:// 协议）
    const finalDyn = await convertDynUrls(convertedDyn);
    
    // 直接返回帖子对象，不包裹 {dyn: ...}，客户端 APIResponse<Post> 直接解码 data 为 Post
    return success(finalDyn);
  } catch (err) {
    console.error('[appGetDynDetail] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 发布动态
 * 核心层: publishDyn
 */
async function PublishDyn(event) {
  try {
    const { openId, data, db } = event;
    const {
      dynContent,
      circleId,
      circleTitle,
      imageIds = [],
      topic = [],
      ait = [],
      music,
      dynVideo
    } = data || {};

    if (!dynContent && imageIds.length === 0 && !dynVideo) {
      return error(400, "动态内容不能为空");
    }

    if (!circleId || !circleTitle) {
      return error(400, "缺少圈子信息");
    }

    // App 发布打标 source，便于列表/详情展示时不做 topic/ait 拼接（App 正文已含 #/@）
    const coreParams = {
      openId: openId,
      dynContent: dynContent || '',
      circleId: circleId,
      circleTitle: circleTitle,
      imageIds: imageIds,
      topic: topic,
      ait: ait,
      source: 'newApp'
    };

    if (music) {
      coreParams.musicPoster = music.musicPoster;
      coreParams.musicName = music.musicName;
      coreParams.musicId = music.musicId;
      coreParams.musicAuthor = music.musicAuthor;
      coreParams.musicSrc = music.musicSrc;
      coreParams.isAudioShow = music.isAudioShow;
    }

    if (dynVideo) {
      coreParams.dynVideo = dynVideo;
    }

    console.log('[appPublishDyn] 调用核心层参数:', coreParams);

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'publishDyn',
      data: coreParams
    });

    console.log('[appPublishDyn] 核心层返回:', result.result);

    if (result.result.code !== 200 && result.result.code !== 201) {
      return error(result.result.code || 500, result.result.message || '发布动态失败');
    }

    return success({
      dynId: result.result.dynId,
      requestID: result.result.requestID,
      code: result.result.code,
      message: result.result.message || '发布成功'
    });
  } catch (err) {
    console.error('[appPublishDyn] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 点赞动态
 * 核心层: likeOrUnlikeV2, type=1
 */
async function LikeDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data || {};

    if (!id) {
      return error(400, "缺少动态ID");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'likeOrUnlikeV2',
      data: {
        id: id,
        type: 1, // 1=点赞动态
        openId: openId
      }
    });

    console.log('[appLikeDyn] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '点赞失败');
    }

    return success({
      isLiked: result.result.isLiked,
      likeNums: result.result.likeNums
    });
  } catch (err) {
    console.error('[appLikeDyn] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 充电动态
 * 核心层: likeOrUnlikeV2, type=2
 */
async function ChargeDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data || {};

    if (!id) {
      return error(400, "缺少动态ID");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'likeOrUnlikeV2',
      data: {
        id: id,
        type: 2, // 2=充电动态
        openId: openId
      }
    });

    console.log('[appChargeDyn] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '充电失败');
    }

    return success({});
  } catch (err) {
    console.error('[appChargeDyn] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 删除动态
 * 核心层: delDyn, type=1
 */
async function DeleteDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data || {};

    if (!id) {
      return error(400, "缺少动态ID");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'delDyn',
      data: {
        id: id,
        type: 1, // 1=删除动态
        openId: openId
      }
    });

    console.log('[appDeleteDyn] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '删除失败');
    }

    return success({});
  } catch (err) {
    console.error('[appDeleteDyn] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取评论列表
 */
async function GetDynComment(event) {
  try {
    const { openId, data, db } = event;
    if (!db) {
      throw new Error('数据库实例未初始化');
    }
    
    // 从 event 获取 _ 和 $ 操作符
    const _ = event._ || db.command;
    const $ = event.$ || db.command.aggregate;
    
    const { id: dynId, page = 1, limit = 20 } = data || {};

    if (!dynId) {
      return error(400, "缺少动态ID");
    }

    const skip = (page - 1) * limit;
    
    let query = {
      dynId,
      comStatus: _.neq(1)
    };

    let comments = (await db.collection('dynComments')
      .aggregate()
      .match(query)
      .sort({ createTime: -1 })
      .skip(skip)
      .limit(limit)
      .lookup({
        from: 'user',
        localField: 'from',
        foreignField: 'openId',
        as: 'fromUser',
      })
      .lookup({
        from: 'user',
        localField: 'to',
        foreignField: 'openId',
        as: 'toUser',
      })
      .end()).list;

    if (comments && comments.length) {
      const commentIds = comments.map(c => c._id);
      
      let commentReplay = (await db.collection('dynCommentReplay')
        .aggregate()
        .match({
          dynId,
          commentId: _.in(commentIds),
          comStatus: _.neq(1)
        })
        .limit(1000)
        .lookup({
          from: 'user',
          localField: 'from',
          foreignField: 'openId',
          as: 'fromUser',
        })
        .lookup({
          from: 'user',
          localField: 'to',
          foreignField: 'openId',
          as: 'toUser',
        })
        .sort({ createTime: 1 })
        .group({
          _id: '$commentId',
          comments: $.push('$$ROOT')
        })
        .end()).list;

      let secondComment = {};
      if (commentReplay && commentReplay.length) {
        commentReplay.forEach(item => {
          secondComment[item._id] = item.comments;
        });
      }

      const formattedComments = comments.map(comment => {
        const fromUser = comment.fromUser && comment.fromUser[0] || {};
        const toUser = comment.toUser && comment.toUser[0] || {};
        const isLiked = comment.like && comment.like.includes(openId) || false;
        
        const formattedComment = {
          id: comment._id,
          postId: comment.dynId,
          userId: comment.from || comment.openId,
          userName: fromUser.nickName || '未知用户',
          userAvatar: fromUser.avatarVisitUrl || fromUser.avatarUrl || null,
          content: comment.commentContent || '',
          imagePath: comment.imagePath || null,
          publishTime: new Date(comment.createTime || comment.serverDate).getTime() / 1000, // 转为秒级时间戳
          likeCount: comment.likeNums || (comment.like ? comment.like.length : 0),
          isLiked: isLiked,
          replies: null,
          mentionedUsers: comment.ait ? comment.ait.map(a => ({
            id: a.openId,
            userName: a.nickName
          })) : null,
          replyToUserId: comment.to || null,
          replyToUserName: toUser.nickName || null,
          forwardStatus: comment.forwradStatus || false
        };

        if (secondComment[comment._id]) {
          formattedComment.replies = secondComment[comment._id].map(reply => {
            const replyFromUser = reply.fromUser && reply.fromUser[0] || {};
            const replyToUser = reply.toUser && reply.toUser[0] || {};
            const replyIsLiked = reply.like && reply.like.includes(openId) || false;
            
            return {
              id: reply._id,
              postId: reply.dynId,
              userId: reply.from || reply.openId,
              userName: replyFromUser.nickName || '未知用户',
              userAvatar: replyFromUser.avatarVisitUrl || replyFromUser.avatarUrl || null,
              content: reply.commentContent || '',
              imagePath: reply.imagePath || null,
              publishTime: new Date(reply.createTime || reply.serverDate).getTime() / 1000, // 转为秒级时间戳
              likeCount: reply.likeNums || (reply.like ? reply.like.length : 0),
              isLiked: replyIsLiked,
              replies: null,
              mentionedUsers: reply.ait ? reply.ait.map(a => ({
                id: a.openId,
                userName: a.nickName
              })) : null,
              replyToUserId: reply.to || null,
              replyToUserName: replyToUser.nickName || null,
              forwardStatus: reply.forwradStatus || false
            };
          });
        }

        return formattedComment;
      });

      const totalResult = await db.collection('dynComments')
        .where(query)
        .count();
      const total = totalResult.total;

      // 转换 cloud:// URL 为 HTTPS URL（iOS 不支持 cloud:// 协议）
      const finalComments = await convertCommentUrls(formattedComments);

      return success({
        list: finalComments,
        total: total,
        hasMore: skip + limit < total
      });
    }

    return success({
      list: [],
      total: 0,
      hasMore: false
    });
  } catch (err) {
    console.error('[appGetDynComment] error:', err);
    return error(500, err.message || "获取评论列表失败");
  }
}

/**
 * 提交评论
 */
async function CommentDyn(event) {
  try {
    const { openId, data, db } = event;
    
    // 从 event 获取 _ 操作符
    const _ = event._ || db.command;
    
    const {
      id: dynId,
      commentContent,
      imagePath,
      commentid: commentId,
      type = 'add',
      to: toUserId,
      ait: mentionedUsers
    } = data || {};

    if (!dynId) {
      return error(400, "缺少动态ID");
    }

    if (!commentContent && !imagePath) {
      return error(400, "评论内容不能为空");
    }

    const userResult = await db.collection('user').where({ openId }).get();
    if (userResult.data.length === 0) {
      return error(404, "用户不存在");
    }
    const user = userResult.data[0];
    if (user.joinStatus !== 1) {
      return error(403, "用户未通过验证");
    }

    if (toUserId && toUserId !== openId) {
      const blackResult = await db.collection('blackList')
        .where({
          from: toUserId,
          to: openId,
          status: 1
        })
        .get();
      if (blackResult.data.length > 0) {
        return error(403, "你已被对方拉黑");
      }
    }

    const dynResult = await db.collection('dyn').doc(dynId).get();
    if (!dynResult.data) {
      return error(404, "动态不存在");
    }

    const serverDate = db.serverDate();
    const createTime = new Date().valueOf();

    let commentResult;
    let messageId = null;

    if (toUserId && toUserId !== openId) {
      const messageResult = await db.collection('messagesOther').add({
        data: {
          type: 2,
          from: openId,
          to: toUserId,
          status: 0,
          commentContent,
          dynId,
          createTime,
          serverDate,
          commentId: commentId || null
        }
      });
      messageId = messageResult._id;
    }

    if (type === 'add' || !commentId) {
      commentResult = await db.collection('dynComments').add({
        data: {
          dynId,
          openId,
          from: openId,
          to: toUserId || openId,
          commentContent,
          imagePath: imagePath || null,
          serverDate,
          createTime,
          addMesId: messageId,
          ait: mentionedUsers || null,
          forwradStatus: false,
          like: [],
          likeNums: 0,
          comStatus: 0
        }
      });

      await db.collection('dyn').doc(dynId).update({
        data: {
          commentNums: _.inc(1)
        }
      });
    } else {
      commentResult = await db.collection('dynCommentReplay').add({
        data: {
          commentId,
          dynId,
          openId,
          from: openId,
          to: toUserId || openId,
          commentContent,
          imagePath: imagePath || null,
          serverDate,
          createTime,
          addMesId: messageId,
          ait: mentionedUsers || null,
          forwradStatus: false,
          like: [],
          likeNums: 0,
          comStatus: 0
        }
      });

      await db.collection('dyn').doc(dynId).update({
        data: {
          commentNums: _.inc(1)
        }
      });
    }

    return success({
      commentId: commentResult._id,
      code: 200,
      message: "评论成功"
    });
  } catch (err) {
    console.error('[appCommentDyn] error:', err);
    return error(500, err.message || "提交评论失败");
  }
}

/**
 * 评论点赞/取消点赞
 */
async function LikeComment(event) {
  try {
    const { openId, data, db } = event;
    
    // 从 event 获取 _ 操作符
    const _ = event._ || db.command;
    
    const {
      id: dynId,
      commentId,
      type,
      firstIndex,
      secondIndex
    } = data || {};

    if (!dynId || !commentId) {
      return error(400, "缺少必要参数");
    }

    const userResult = await db.collection('user').where({ openId }).get();
    if (userResult.data.length === 0) {
      return error(404, "用户不存在");
    }
    const user = userResult.data[0];
    if (user.joinStatus !== 1) {
      return error(403, "用户未通过验证");
    }

    let commentDetail;
    let collectionName;

    if (type === 4 || secondIndex !== undefined) {
      collectionName = 'dynCommentReplay';
      commentDetail = (await db.collection('dynCommentReplay').doc(commentId).get()).data;
    } else {
      collectionName = 'dynComments';
      commentDetail = (await db.collection('dynComments').doc(commentId).get()).data;
    }

    if (!commentDetail) {
      return error(404, "评论不存在");
    }

    if (commentDetail.comStatus === 1) {
      return error(400, "评论已删除");
    }

    const like = commentDetail.like || [];
    const isLiked = like.includes(openId);

    if (isLiked) {
      await db.collection(collectionName).doc(commentId).update({
        data: {
          like: _.pull(openId),
          likeNums: _.inc(-1)
        }
      });
    } else {
      const fromUserId = commentDetail.from || commentDetail.openId;
      if (fromUserId !== openId) {
        const blackResult = await db.collection('blackList')
          .where({
            from: fromUserId,
            to: openId,
            status: 1
          })
          .get();
        if (blackResult.data.length > 0) {
          return error(403, "你已被对方拉黑");
        }
      }

      await db.collection(collectionName).doc(commentId).update({
        data: {
          like: _.push(openId),
          likeNums: _.inc(1)
        }
      });
    }

    return success({});
  } catch (err) {
    console.error('[appLikeComment] error:', err);
    return error(500, err.message || "点赞操作失败");
  }
}

/**
 * 删除评论
 */
async function DeleteComment(event) {
  try {
    const { openId, data, db } = event;
    
    // 从 event 获取 _ 操作符
    const _ = event._ || db.command;
    
    const {
      id: dynId,
      commentId,
      type,
      firstIndex,
      secondIndex
    } = data || {};

    if (!dynId || !commentId) {
      return error(400, "缺少必要参数");
    }

    let commentDetail;
    let collectionName;

    if (type === 4 || secondIndex !== undefined) {
      collectionName = 'dynCommentReplay';
      commentDetail = (await db.collection('dynCommentReplay').doc(commentId).get()).data;
    } else {
      collectionName = 'dynComments';
      commentDetail = (await db.collection('dynComments').doc(commentId).get()).data;
    }

    if (!commentDetail) {
      return error(404, "评论不存在");
    }

    const fromUserId = commentDetail.from || commentDetail.openId;
    if (fromUserId !== openId) {
      return error(403, "无权删除他人评论");
    }

    await db.collection(collectionName).doc(commentId).update({
      data: {
        comStatus: 1
      }
    });

    await db.collection('dyn').doc(dynId).update({
      data: {
        commentNums: _.inc(-1)
      }
    });

    if (commentDetail.addMesId) {
      await db.collection('messagesOther').doc(commentDetail.addMesId).update({
        data: {
          status: 2
        }
      });
    }

    return success({});
  } catch (err) {
    console.error('[appDeleteComment] error:', err);
    return error(500, err.message || "删除评论失败");
  }
}

/**
 * 转发动态
 */
async function RepostDyn(event) {
  try {
    const { openId, data, db } = event;
    
    // 从 event 获取 _ 操作符
    const _ = event._ || db.command;
    
    const {
      id: dynId,
      content: dynContent,
      circleId,
      circleTitle,
      ait: mentionedUsers,
      ifForComment = false
    } = data || {};

    if (!dynId) {
      return error(400, "缺少动态ID");
    }

    const userResult = await db.collection('user').where({ openId }).get();
    if (userResult.data.length === 0) {
      return error(404, "用户不存在");
    }
    const user = userResult.data[0];
    if (user.joinStatus !== 1) {
      return error(403, "用户未通过验证");
    }

    const forwardDynResult = await db.collection('dyn')
      .aggregate()
      .match({ _id: dynId })
      .project({
        openId: 1,
        dynContent: 1,
        imagePath: 1,
        imageList: 1,
        musicId: 1,
        musicName: 1,
        musicPoster: 1,
        musicSrc: 1
      })
      .lookup({
        from: 'user',
        localField: 'openId',
        foreignField: 'openId',
        as: 'userInfo'
      })
      .end();

    if (!forwardDynResult.list || forwardDynResult.list.length === 0) {
      return error(404, "动态不存在");
    }

    const forwardInfo = forwardDynResult.list[0];
    const forwardOwnerId = forwardInfo.openId;

    const blackResult = await db.collection('blackList')
      .where({
        from: forwardOwnerId,
        to: openId,
        status: 1
      })
      .get();
    if (blackResult.data.length > 0) {
      return error(403, "你已被对方拉黑");
    }

    const serverDate = db.serverDate();
    const createTime = new Date().valueOf();

    const newDynResult = await db.collection('dyn').add({
      data: {
        openId,
        dynContent: dynContent || '',
        forwardDynId: dynId,
        forwardDynStatus: 1,
        forwardInfo: {
          openId: forwardInfo.openId,
          dynContent: forwardInfo.dynContent,
          imagePath: forwardInfo.imagePath,
          imageList: forwardInfo.imageList,
          musicId: forwardInfo.musicId,
          musicName: forwardInfo.musicName,
          musicPoster: forwardInfo.musicPoster,
          musicSrc: forwardInfo.musicSrc,
          userInfo: forwardInfo.userInfo
        },
        dynType: 2,
        circleId: circleId || '',
        circleTitle: circleTitle || '',
        dynStatus: 1,
        isDelete: 0,
        likeNums: 0,
        commentNums: 0,
        forwardNums: 0,
        ait: mentionedUsers || null,
        publicTime: createTime,
        serverDate,
        createTime
      }
    });

    await db.collection('dyn').doc(dynId).update({
      data: {
        forwardNums: _.inc(1)
      }
    });

    if (ifForComment && dynContent) {
      await db.collection('dynComments').add({
        data: {
          dynId,
          openId,
          from: openId,
          to: forwardOwnerId,
          commentContent: dynContent,
          serverDate,
          createTime,
          ait: mentionedUsers || null,
          forwradStatus: true,
          like: [],
          likeNums: 0,
          comStatus: 0
        }
      });

      await db.collection('dyn').doc(dynId).update({
        data: {
          commentNums: _.inc(1)
        }
      });
    }

    return success({
      dynId: newDynResult._id,
      message: "转发成功"
    });
  } catch (err) {
    console.error('[appRepostDyn] error:', err);
    return error(500, err.message || "转发失败");
  }
}

/**
 * 收藏动态
 * 写入 dynFavorite：openId=当前用户，dynId，upOpenId=帖子作者，favoriteFlag='0'
 */
async function FavoriteDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id: dynId } = data || {};
    if (!dynId || !db) return error(400, "缺少动态ID或数据库未初始化");
    const dynDoc = await db.collection('dyn').doc(dynId).get();
    if (!dynDoc.data) return error(404, "动态不存在");
    const upOpenId = dynDoc.data.openId || '';
    const existing = await db.collection('dynFavorite').where({ openId, dynId }).get();
    if (existing.data && existing.data.length > 0) {
      await db.collection('dynFavorite').where({ openId, dynId }).update({
        data: { favoriteFlag: '0', updateDate: Date.now() }
      });
    } else {
      await db.collection('dynFavorite').add({
        data: {
          openId,
          upOpenId,
          dynId,
          favoriteFlag: '0',
          createDate: Date.now(),
          updateDate: Date.now()
        }
      });
    }
    return success({});
  } catch (err) {
    console.error('[appFavoriteDyn] error:', err);
    return error(500, err.message || "收藏失败");
  }
}

/**
 * 取消收藏动态
 */
async function UnfavoriteDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id: dynId } = data || {};
    if (!dynId || !db) return error(400, "缺少动态ID或数据库未初始化");
    const existing = await db.collection('dynFavorite').where({ openId, dynId }).get();
    if (existing.data && existing.data.length > 0) {
      await db.collection('dynFavorite').where({ openId, dynId }).update({
        data: { favoriteFlag: '1', updateDate: Date.now() }
      });
    }
    return success({});
  } catch (err) {
    console.error('[appUnfavoriteDyn] error:', err);
    return error(500, err.message || "取消收藏失败");
  }
}

/**
 * 个人主页置顶/取消置顶
 * 核心层: setDynAction, type=16 置顶, type=15 取消置顶
 */
async function SetUserProfilePin(event) {
  try {
    const { openId, data } = event;
    const { postId, pin } = (data || {});
    if (!postId) return error(400, "缺少动态ID");
    const type = pin ? 16 : 15; // 16=个人主页置顶, 15=取消个人主页置顶
    const result = await cloud.callFunction({
      name: 'setDynAction',
      data: {
        type,
        dynId: postId,
        source: 'newApp',
        openId
      }
    });
    const res = result.result;
    if (res && res.code !== 200) {
      return error(res.code || 500, res.message || (pin ? "置顶失败" : "取消置顶失败"));
    }
    return success({});
  } catch (err) {
    console.error('[appSetUserProfilePin] error:', err);
    return error(500, err.message || "操作失败");
  }
}

module.exports = {
  GetDynList,
  GetDynDetail,
  PublishDyn,
  LikeDyn,
  ChargeDyn,
  DeleteDyn,
  GetDynComment,
  CommentDyn,
  LikeComment,
  DeleteComment,
  RepostDyn,
  FavoriteDyn,
  UnfavoriteDyn,
  SetUserProfilePin,
  // 供 circle 等模块复用：先转 App 格式 + URL 转换 + 统一 publicTime
  convertDynToAppFormat,
  toMillisTimestamp
};
