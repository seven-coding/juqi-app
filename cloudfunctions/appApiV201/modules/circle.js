// 圈子模块
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');
const { convertDynListUrls } = require('../utils/url');
const { convertDynToAppFormat, toMillisTimestamp } = require('./dyn');
const { getFuncName } = require('../utils/env');
const { mapTopicForClient } = require('./search');

/** App 发现页允许展示的电站名称（仅显示以下电站；日常已屏蔽） */
const APP_VISIBLE_CIRCLE_NAMES = new Set([
  '公告板',
  '帮橘气做大做强',
  '新人报道区',
  '蒸友找对象',
  '彩虹研讨橘',
  '树洞',
]);

/**
 * 将核心层返回的圈子项规范为 App 客户端可解码的格式
 * 保留 _id、title/name、desc、imageSmall、isMemberPublic、isSecret（发布页选择电站时显示锁/树洞说明）
 */
function normalizeCircleItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw._id != null ? String(raw._id) : (raw.circleId != null ? String(raw.circleId) : '');
  const title = raw.title != null ? String(raw.title) : (raw.name != null ? String(raw.name) : '');
  const desc = raw.desc != null ? String(raw.desc) : null;
  const imageSmall = raw.imageSmall != null ? String(raw.imageSmall) : null;
  const isMemberPublic = raw.isMemberPublic === true || raw.isMemberPublic === 1;
  const isSecret = raw.isSecret === true || raw.isSecret === 1;
  return { _id: id, title, name: title, desc, imageSmall, isMemberPublic, isSecret };
}

/**
 * 判断电站是否在 App 中显示（按名称白名单）
 */
function isCircleVisibleInApp(title) {
  return title && APP_VISIBLE_CIRCLE_NAMES.has(String(title).trim());
}

/**
 * 获取圈子列表
 * 核心层: getCircle
 * 返回 list 已规范化，且仅包含「允许在 App 显示」的电站（按名称白名单过滤）
 */
async function GetCircleList(event) {
  try {
    const { openId, data, db } = event;

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('getCircle'),
      data: {
        openId: openId || '',
        requestId: event.requestId || ''
      }
    });

    const payload = result && result.result;
    console.log('[appGetCircleList] 核心层返回 code:', payload ? payload.code : 'no result');

    if (!payload || payload.code !== 200) {
      return error(payload ? (payload.code || 500) : 500, payload ? (payload.message || '获取圈子列表失败') : '获取圈子列表失败');
    }

    const rawList = payload.data || payload.list || [];
    const normalized = Array.isArray(rawList)
      ? rawList.map(normalizeCircleItem).filter(Boolean)
      : [];
    const list = normalized.filter(item => isCircleVisibleInApp(item.title));

    return success({ list });
  } catch (err) {
    console.error('[appGetCircleList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取圈子详情
 * 核心层: getCircleDetail
 * 注意：参数名是id，不是circleId
 */
async function GetCircleDetail(event) {
  try {
    const { openId, data, db } = event;
    const { circleId } = data || {};

    if (!circleId) {
      return error(400, "缺少圈子ID");
    }

    // 调用核心层 - 参数名是id
    const result = await cloud.callFunction({
      name: getFuncName('getCircleDetail'),
      data: {
        id: circleId,  // 注意：参数名是id，不是circleId
        openId: openId,
        ownOpenId: openId,
        requestId: event.requestId || ''
      }
    });

    const coreRes = result && result.result;
    console.log('[appGetCircleDetail] 核心层返回:', coreRes);

    if (!coreRes || coreRes.code !== 200) {
      return error(
        (coreRes && coreRes.code) || 500,
        (coreRes && coreRes.message) || '获取圈子详情失败'
      );
    }

    return success({
      circle: coreRes.data,
      follow: coreRes.follow,
      followStatus: coreRes.followStatus,
      followUserInfo: coreRes.followUserInfo
    });
  } catch (err) {
    console.error('[appGetCircleDetail] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 加入圈子
 * 核心层: setJoinCircle, type=1
 */
async function JoinCircle(event) {
  try {
    const { openId, data, db } = event;
    const { circleId } = data || {};

    if (!circleId) {
      return error(400, "缺少圈子ID");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('setJoinCircle'),
      data: {
        circleId: circleId,
        type: 1, // 1=加入圈子
        openId: openId,
        requestId: event.requestId || ''
      }
    });

    console.log('[appJoinCircle] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '加入圈子失败');
    }

    return success({});
  } catch (err) {
    console.error('[appJoinCircle] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 退出圈子
 * 核心层: setJoinCircle, type=2
 */
async function QuitCircle(event) {
  try {
    const { openId, data, db } = event;
    const { circleId } = data || {};

    if (!circleId) {
      return error(400, "缺少圈子ID");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('setJoinCircle'),
      data: {
        circleId: circleId,
        type: 2, // 2=退出圈子
        openId: openId,
        requestId: event.requestId || ''
      }
    });

    console.log('[appQuitCircle] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '退出圈子失败');
    }

    return success({});
  } catch (err) {
    console.error('[appQuitCircle] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取话题列表
 * 核心层: getTopic
 */
async function GetTopicList(event) {
  try {
    const { openId, data, db } = event;

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('getTopic'),
      data: {
        openId: openId,
        requestId: event.requestId || '',
        type: 2  // 2=默认/推荐话题，取 recommend: true
      }
    });

    console.log('[appGetTopicList] 核心层返回:', result.result);

    if (!result.result) {
      return error(500, '核心层返回结果为空');
    }

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取话题列表失败');
    }

    const raw = result.result.data || result.result.list || [];
    const list = Array.isArray(raw) ? raw.map(mapTopicForClient) : [];
    return success({ list });
  } catch (err) {
    console.error('[appGetTopicList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取话题详情
 * 直接查 topics + 动态数，返回 App 可解码的扁平结构（含 joinCounts）
 */
async function GetTopicDetail(event) {
  try {
    const { openId, data, db, _ } = event;
    const topicName = data?.topicId || data?.topic;

    if (!topicName) {
      return error(400, "缺少话题ID或话题名");
    }

    const topicResult = await db.collection('topics')
      .aggregate()
      .match({ topic: topicName })
      .lookup({
        from: 'user',
        localField: 'openId',
        foreignField: 'openId',
        as: 'fromUser'
      })
      .end();

    if (!topicResult.list || topicResult.list.length === 0) {
      return error(404, "话题不存在");
    }

    const topicData = topicResult.list[0];
    const fromUser = topicData.fromUser && topicData.fromUser[0] ? topicData.fromUser[0] : null;

    const dynCountResult = await db.collection('dyn')
      .where({
        topic: _.in([topicName]),
        dynStatus: 1
      })
      .count();

    return success({
      id: topicData._id,
      name: topicData.topic,
      icon: topicData.icon || null,
      description: topicData.description ?? topicData.topicDesc ?? null,
      createTime: topicData.createTime ?? null,
      creator: fromUser ? {
        id: fromUser.openId,
        userName: fromUser.nickName,
        avatar: fromUser.avatarVisitUrl || fromUser.avatarUrl || null
      } : null,
      dynCount: dynCountResult.total || 0,
      joinCounts: topicData.joinCounts ?? 0
    });
  } catch (err) {
    console.error('[appGetTopicDetail] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取话题动态列表
 * 与首页一致：先转 App 格式 → 再转 URL → 再统一 publicTime，再给客户端
 * 核心层: getDynsListV2, type=5
 */
async function GetTopicDynList(event) {
  try {
    const { openId, data, db } = event;
    const { topic, page = 1, limit = 20, publicTime } = data || {};

    if (!topic) {
      return error(400, "缺少话题名");
    }

    const safeOpenId = openId != null && openId !== '' ? openId : '';
    const coreParams = {
      source: 'newApp',
      openId: safeOpenId,
      ownOpenId: safeOpenId,
      type: 5, // 5=话题动态
      topic: topic,
      limit: limit
    };

    if (publicTime) {
      coreParams.publicTime = publicTime;
    }
    if (event.envId) coreParams.envId = event.envId;

    console.log('[appGetTopicDynList] 调用核心层参数:', coreParams);

    coreParams.requestId = event.requestId || '';
    const result = await cloud.callFunction({
      name: getFuncName('getDynsListV2'),
      data: coreParams
    });

    console.log('[appGetTopicDynList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取话题动态列表失败');
    }

    // 1. 转 App 格式（与首页 GetDynList 一致）
    const rawDynList = result.result.dynList || [];
    const convertedList = rawDynList.map(dyn => convertDynToAppFormat(dyn, safeOpenId));

    // 2. 转 URL（cloud:// → HTTPS）
    const finalList = await convertDynListUrls(convertedList);

    // 3. 统一 publicTime 为毫秒时间戳（与首页一致）
    let rawPublicTime = result.result.publicTime;
    let cursorTime = null;
    if (rawPublicTime != null) {
      cursorTime = toMillisTimestamp(rawPublicTime);
    }

    return success({
      list: finalList,
      total: result.result.count || 0,
      hasMore: finalList.length >= limit,
      publicTime: cursorTime
    });
  } catch (err) {
    console.error('[appGetTopicDynList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 创建话题
 * 核心层: setTopic
 */
async function CreateTopic(event) {
  try {
    const { openId, data, db } = event;
    const rawTopic = data?.topic;
    if (rawTopic == null || String(rawTopic).trim() === '') {
      return error(400, "缺少话题名称");
    }
    const topic = String(rawTopic).trim();

    // 调用核心层（type: 1 = 增加话题）
    const result = await cloud.callFunction({
      name: getFuncName('setTopic'),
      data: {
        type: 1,
        topic: String(topic).trim(),
        openId: openId || '',
        requestId: event.requestId || '',
        source: 'newApp'
      }
    });

    console.log('[appCreateTopic] 核心层返回:', result.result);

    if (!result.result) {
      return error(500, '核心层返回结果为空');
    }

    if (result.result.code !== 200) {
      const msg = result.result.message || result.result.messge || '创建话题失败';
      return error(result.result.code || 500, msg);
    }

    // 客户端期望 data 为 Topic 格式（id, name, icon）
    const raw = result.result.data;
    const topicForClient = raw ? mapTopicForClient(raw) : { id: '', name: String(topic).trim(), icon: null };
    return success(topicForClient);
  } catch (err) {
    console.error('[appCreateTopic] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

module.exports = {
  GetCircleList,
  GetCircleDetail,
  JoinCircle,
  QuitCircle,
  GetTopicList,
  GetTopicDetail,
  GetTopicDynList,
  CreateTopic
};
