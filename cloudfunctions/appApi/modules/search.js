// 搜索模块
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');

/**
 * 搜索用户
 * 核心层: getRearch, type=1
 */
async function SearchUser(event) {
  try {
    const { openId, data, db } = event;
    const { keyword, page = 1, limit = 20 } = data || {};

    if (!keyword) {
      return error(400, "缺少搜索关键词");
    }

    // 调用核心层 - type=1表示搜索用户
    const result = await cloud.callFunction({
      name: 'getRearch',
      data: {
        keyword: keyword,
        type: 1,  // 1=搜索用户（数字类型）
        page: page,
        limit: limit,
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appSearchUser] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '搜索失败');
    }

    return success({
      list: result.result.data || [],
      total: result.result.count || 0,
      hasMore: (result.result.data || []).length >= limit
    });
  } catch (err) {
    console.error('[appSearchUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 搜索动态
 * 核心层: getRearch, type=2
 */
async function SearchDyn(event) {
  try {
    const { openId, data, db } = event;
    const { keyword, page = 1, limit = 20 } = data || {};

    if (!keyword) {
      return error(400, "缺少搜索关键词");
    }

    // 调用核心层 - type=2表示搜索动态
    const result = await cloud.callFunction({
      name: 'getRearch',
      data: {
        keyword: keyword,
        type: 2,  // 2=搜索动态（数字类型）
        page: page,
        limit: limit,
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appSearchDyn] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '搜索失败');
    }

    return success({
      list: result.result.data || [],
      total: result.result.count || 0,
      hasMore: (result.result.data || []).length >= limit
    });
  } catch (err) {
    console.error('[appSearchDyn] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 搜索话题
 * 核心层: getRearch, type=3 或 getTopic（无keyword时）
 */
async function SearchTopic(event) {
  try {
    const { openId, data, db } = event;
    const { keyword, page = 1, limit = 20 } = data || {};

    // 如果没有关键词，调用getTopic获取话题列表
    if (!keyword) {
      const result = await cloud.callFunction({
        name: 'getTopic',
        data: {
          openId: openId
        }
      });

      console.log('[appSearchTopic] 获取话题列表返回:', result.result);

      if (result.result.code !== 200) {
        return error(result.result.code || 500, result.result.message || '获取话题列表失败');
      }

      return success({
        list: result.result.data || [],
        total: (result.result.data || []).length,
        hasMore: false
      });
    }

    // 有关键词时，调用getRearch搜索话题
    const result = await cloud.callFunction({
      name: 'getRearch',
      data: {
        keyword: keyword,
        type: 3,  // 3=搜索话题（数字类型）
        page: page,
        limit: limit,
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appSearchTopic] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '搜索失败');
    }

    return success({
      list: result.result.data || [],
      total: result.result.count || 0,
      hasMore: (result.result.data || []).length >= limit
    });
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
      name: 'getRearch',
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
  SearchCircle
};
