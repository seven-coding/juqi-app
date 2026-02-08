// 圈子模块
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');

/**
 * 获取圈子列表
 * 核心层: getCircle
 */
async function GetCircleList(event) {
  try {
    const { openId, data, db } = event;

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getCircle',
      data: {
        openId: openId
      }
    });

    console.log('[appGetCircleList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取圈子列表失败');
    }

    return success({
      list: result.result.data || result.result.list || []
    });
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
      name: 'getCircleDetail',
      data: {
        id: circleId,  // 注意：参数名是id，不是circleId
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appGetCircleDetail] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取圈子详情失败');
    }

    return success({
      circle: result.result.data,
      follow: result.result.follow,
      followStatus: result.result.followStatus,
      followUserInfo: result.result.followUserInfo
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
      name: 'setJoinCircle',
      data: {
        circleId: circleId,
        type: 1, // 1=加入圈子
        openId: openId
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
      name: 'setJoinCircle',
      data: {
        circleId: circleId,
        type: 2, // 2=退出圈子
        openId: openId
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
      name: 'getTopic',
      data: {
        openId: openId
      }
    });

    console.log('[appGetTopicList] 核心层返回:', result.result);

    if (!result.result) {
      return error(500, '核心层返回结果为空');
    }

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取话题列表失败');
    }

    return success({
      list: result.result.data || result.result.list || []
    });
  } catch (err) {
    console.error('[appGetTopicList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取话题详情
 * 核心层: getTopic
 */
async function GetTopicDetail(event) {
  try {
    const { openId, data, db } = event;
    const { topicId, topic } = data || {};

    if (!topicId && !topic) {
      return error(400, "缺少话题ID或话题名");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getTopic',
      data: {
        openId: openId,
        topicId: topicId,
        topic: topic
      }
    });

    console.log('[appGetTopicDetail] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取话题详情失败');
    }

    return success({
      topic: result.result.data
    });
  } catch (err) {
    console.error('[appGetTopicDetail] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取话题动态列表
 * 核心层: getDynsListV2, type=5
 */
async function GetTopicDynList(event) {
  try {
    const { openId, data, db } = event;
    const { topic, page = 1, limit = 20, publicTime } = data || {};

    if (!topic) {
      return error(400, "缺少话题名");
    }

    const coreParams = {
      source: 'newApp', // 必须：让核心层使用 event.openId 而非 wxContext.OPENID
      openId: openId,
      ownOpenId: openId,
      type: 5, // 5=话题动态
      topic: topic,
      limit: limit
    };

    if (publicTime) {
      coreParams.publicTime = publicTime;
    }

    console.log('[appGetTopicDynList] 调用核心层参数:', coreParams);

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams
    });

    console.log('[appGetTopicDynList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取话题动态列表失败');
    }

    const dynList = result.result.dynList || [];
    return success({
      list: dynList,
      total: result.result.count || 0,
      hasMore: dynList.length >= limit,
      publicTime: result.result.publicTime
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
    const { topic } = data || {};

    if (!topic) {
      return error(400, "缺少话题名称");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setTopic',
      data: {
        topic: topic,
        openId: openId
      }
    });

    console.log('[appCreateTopic] 核心层返回:', result.result);

    if (!result.result) {
      return error(500, '核心层返回结果为空');
    }

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '创建话题失败');
    }

    return success({
      topic: result.result.data
    });
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
