// 搜索模块
// 版本: 2.3.0 - 搜索动态与首页一致：复用 dyn 模块 convertDynToAppFormat + convertDynListUrls
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');
const { convertDynToAppFormat } = require('./dyn');
const { convertDynListUrls } = require('../utils/url');
const { getFuncName } = require('../utils/env');

/** 转义字符串用于 RegExp，避免关键词中的 .*+?^${}()|[\]\\ 破坏查询 */
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 内部：搜索用户（使用 event.db，与 dataEnv 一致）
 * 与 getRearch/getUserRec 逻辑对齐
 */
async function searchUsersInternal(db, _, keyword, page, limit) {
  const safe = escapeRegExp(keyword);
  const query = _.and([
    _.or([
      { nickName: db.RegExp({ regexp: '.*' + safe, options: 'i' }) },
      { labels: db.RegExp({ regexp: '.*' + safe, options: 'i' }) },
      { province: db.RegExp({ regexp: safe, options: 'i' }) },
    ]),
    { joinStatus: _.in([1, 2, 3, 4, 5, -1]) },
  ]);
  const countRes = await db.collection('user').where(query).count();
  const total = countRes.total;
  const agg = await db.collection('user').aggregate().match(query)
    .addFields({
      userSecret: [{
        juqiCoin: '$juqiCoin',
        juqiBuy: '$juqiBuy',
        juqiReward: '$juqiReward',
        juqiCoinUse: '$juqiCoinUse',
        vipStatus: '$vipStatus',
        vipStartTime: '$vipStartTime',
        vipEndTime: '$vipEndTime',
        vipOperateTime: '$vipOperateTime',
        avatarHat: '$avatarHat',
        avatarStatus: '$avatarStatus',
        avatarHatId: '$avatarHatId',
        volunteerStatus: '$volunteerStatus',
        volunteerNo: '$volunteerNo',
        volunteerTime: '$volunteerTime',
        partnerStatus: '$partnerStatus',
        partnerNo: '$partnerNo',
        partnerTime: '$partnerTime',
        partnerDeclaration: '$partnerDeclaration',
        avaOperateTime: '$avaOperateTime',
        avatarHatTime: '$avatarHatTime',
        dressPlace: '$dressPlace',
      }],
    })
    .skip((page - 1) * limit)
    .limit(limit)
    .end();
  return { list: agg.list || [], total };
}

/**
 * 内部：搜索动态（使用 event.db）
 * 先简单查询 dyn 再批量查 user，避免 aggregate+lookup 超时（-501001）
 */
async function searchDynsInternal(db, _, keyword, page, limit) {
  const safe = escapeRegExp(keyword);
  const query = {
    dynStatus: 1,
    dynContent: db.RegExp({ regexp: safe, options: 'i' }),
  };
  const countRes = await db.collection('dyn').where(query).count();
  const total = countRes.total;
  const dynRes = await db.collection('dyn')
    .where(query)
    .orderBy('publicTime', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const dynList = dynRes.data || [];
  if (dynList.length === 0) {
    return { list: [], total };
  }
  const openIds = [...new Set(dynList.map((d) => d.openId).filter(Boolean))];
  let userMap = {};
  if (openIds.length > 0) {
    const userRes = await db.collection('user')
      .where({ openId: _.in(openIds) })
      .field({
        openId: true,
        avatarUrl: true,
        nickName: true,
        labels: true,
        country: true,
        joinStatus: true,
        avatarVisitUrl: true,
      })
      .get();
    const users = userRes.data || [];
    users.forEach((u) => { userMap[u.openId] = u; });
  }
  const list = dynList.map((d) => {
    const row = { ...d };
    row.userInfo = userMap[d.openId] ? [userMap[d.openId]] : [];
    return row;
  });
  return { list, total };
}

/**
 * 内部：搜索话题（使用 event.db）
 * 与 getRearch/getTopicRec 逻辑对齐
 */
async function searchTopicsInternal(db, _, keyword, page, limit) {
  const safe = escapeRegExp(keyword);
  const query = _.or([
    { topic: db.RegExp({ regexp: safe, options: 'i' }) },
    { topicDesc: db.RegExp({ regexp: safe, options: 'i' }) },
  ]);
  const countRes = await db.collection('topics').where(query).count();
  const total = countRes.total;
  const agg = await db.collection('topics').aggregate()
    .match(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .end();
  return { list: agg.list || [], total };
}

/**
 * 聚合搜索：一次请求返回用户 / 动态 / 话题三类结果
 * 在 appApi 内部使用 event.db 直连，不调用 getRearch，避免内容安全阻断、数据环境一致
 */
async function SearchAll(event) {
  try {
    const { data, db, _, $ } = event;
    const { keyword, page = 1, limitPerType = 10 } = data || {};

    if (!keyword || String(keyword).trim() === '') {
      return error(400, '缺少搜索关键词');
    }

    const k = String(keyword).trim();
    const limit = Math.min(Math.max(1, limitPerType || 10), 20);

    const [usersRes, dynsRes, topicsRes] = await Promise.all([
      searchUsersInternal(db, _, k, page, limit),
      searchDynsInternal(db, _, k, page, limit),
      searchTopicsInternal(db, _, k, page, limit),
    ]);

    const openId = event.openId != null ? event.openId : '';
    const dynListApp = await convertSearchDynListToAppFormat(dynsRes.list, openId);

    return success({
      users: {
        list: (usersRes.list || []).map(mapUserForClient),
        total: usersRes.total,
        hasMore: usersRes.list.length >= limit && usersRes.total > page * limit,
      },
      dyns: {
        list: dynListApp,
        total: dynsRes.total,
        hasMore: (dynsRes.list || []).length >= limit && dynsRes.total > page * limit,
      },
      topics: {
        list: (topicsRes.list || []).map(mapTopicForClient),
        total: topicsRes.total,
        hasMore: topicsRes.list.length >= limit && topicsRes.total > page * limit,
      },
    });
  } catch (err) {
    console.error('[appSearchAll] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/** 从 DB 的 _id（可能为对象或字符串）取出字符串 id，供客户端 Decoding */
function ensureId(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v.oid) return String(v.oid);
  if (typeof v === 'object' && typeof v.toString === 'function') return v.toString();
  return String(v);
}

/** 将 DB 用户文档转为客户端 User 格式：含 id、userName（客户端 Decoding 要求） */
function mapUserForClient(u) {
  if (!u) return u;
  const id = (u.openId != null && u.openId !== '') ? String(u.openId) : ensureId(u._id);
  return {
    ...u,
    id,
    userName: u.nickName != null ? u.nickName : (u.userName != null ? u.userName : ''),
  };
}

/** 将 DB 话题文档转为客户端 Topic 格式：含 id、name、icon */
function mapTopicForClient(t) {
  if (!t) return t;
  return {
    ...t,
    id: ensureId(t._id) || String(t.topic || ''),
    name: t.topic != null ? t.topic : (t.name != null ? t.name : ''),
    icon: t.icon != null ? t.icon : null,
  };
}

/**
 * 将搜索得到的动态列表转为与首页一致的 App 格式（与 appGetDynList 一致）
 * 使用 dyn 模块 convertDynToAppFormat + convertDynListUrls
 */
async function convertSearchDynListToAppFormat(dynList, currentOpenId) {
  const list = dynList || [];
  const converted = list.map((dyn) => convertDynToAppFormat(dyn, currentOpenId));
  return await convertDynListUrls(converted);
}

/**
 * 搜索用户（appApi 内部实现，不调用 getRearch，避免内容安全阻断）
 * 客户端期望 data 为数组 [User]，且每项含 id、userName
 */
async function SearchUser(event) {
  try {
    const { data, db, _ } = event;
    const { keyword, page = 1, limit = 20 } = data || {};

    if (!keyword || String(keyword).trim() === '') {
      return error(400, "缺少搜索关键词");
    }

    const k = String(keyword).trim();
    const lim = Math.min(Math.max(1, limit || 20), 50);
    const { list } = await searchUsersInternal(db, _, k, page, lim);
    return success((list || []).map(mapUserForClient));
  } catch (err) {
    console.error('[appSearchUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 搜索动态（appApi 内部实现，不调用 getRearch，避免内容安全阻断）
 * 字段与解析规则与首页 appGetDynList 一致：convertDynToAppFormat + convertDynListUrls
 */
async function SearchDyn(event) {
  try {
    const { data, db, _, openId } = event;
    const { keyword, page = 1, limit = 20 } = data || {};

    if (!keyword || String(keyword).trim() === '') {
      return error(400, "缺少搜索关键词");
    }

    const k = String(keyword).trim();
    const lim = Math.min(Math.max(1, limit || 20), 50);
    const { list, total } = await searchDynsInternal(db, _, k, page, lim);
    const currentOpenId = openId != null ? openId : '';
    const finalList = await convertSearchDynListToAppFormat(list, currentOpenId);
    return success({
      list: finalList,
      total,
      hasMore: (list || []).length >= lim && total > page * lim,
    });
  } catch (err) {
    console.error('[appSearchDyn] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 搜索话题（无关键词时仍调 getTopic 取列表；有关键词时 appApi 内部实现，不调 getRearch）
 * 客户端期望 data 为数组 [Topic] 或带 list 的列表，此处统一返回 success(list)
 */
async function SearchTopic(event) {
  try {
    const { openId, data, db, _, $ } = event;
    const { keyword, page = 1, limit = 20 } = data || {};

    if (!keyword || String(keyword).trim() === '') {
      const result = await cloud.callFunction({
        name: getFuncName('getTopic'),
        data: { openId: openId || '' },
      });
      if (result.result.code !== 200) {
        return error(result.result.code || 500, result.result.message || '获取话题列表失败');
      }
      const raw = result.result.data || result.result.list || [];
      const list = Array.isArray(raw) ? raw.map(mapTopicForClient) : [];
      return success(list);
    }

    const k = String(keyword).trim();
    const lim = Math.min(Math.max(1, limit || 20), 50);
    const { list } = await searchTopicsInternal(db, _, k, page, lim);
    return success((list || []).map(mapTopicForClient));
  } catch (err) {
    console.error('[appSearchTopic] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 搜索电站/圈子
 * 核心层: getRearch, type=4
 */
async function SearchCircle(event) {
  try {
    const { openId, data, db } = event;
    const { keyword, page = 1, limit = 20 } = data || {};

    if (!keyword) {
      return error(400, "缺少搜索关键词");
    }

    // 调用核心层 - type=4表示搜索电站
    const result = await cloud.callFunction({
      name: getFuncName('getRearch'),
      data: {
        keyword: keyword,
        type: 4,  // 4=搜索电站（数字类型）
        page: page,
        limit: limit,
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appSearchCircle] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '搜索失败');
    }

    return success({
      list: result.result.data || [],
      total: result.result.count || 0,
      hasMore: (result.result.data || []).length >= limit
    });
  } catch (err) {
    console.error('[appSearchCircle] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

module.exports = {
  SearchUser,
  SearchDyn,
  SearchTopic,
  SearchCircle,
  SearchAll,
  mapTopicForClient,
};
