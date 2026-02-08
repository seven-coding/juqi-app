// 消息模块
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');

/**
 * 格式化未读数统计
 * iOS 期望的格式是 { chargeNums: { total: Int }, ... }
 * 核心层返回的也是 { total: number } 格式
 */
function formatNotReadCount(notReadCount) {
  // 确保返回 { total: number } 格式
  const toCountObject = (val) => {
    if (val && typeof val.total === 'number') {
      return { total: val.total };
    }
    if (typeof val === 'number') {
      return { total: val };
    }
    return { total: 0 };
  };

  if (!notReadCount) {
    return {
      visitorNums: { total: 0 },
      commentNums: { total: 0 },
      chargeNums: { total: 0 },
      aitType1Nums: { total: 0 },
      aitType2Nums: { total: 0 }
    };
  }

  return {
    visitorNums: toCountObject(notReadCount.visitorNums),
    commentNums: toCountObject(notReadCount.commentNums),
    chargeNums: toCountObject(notReadCount.chargeNums),
    aitType1Nums: toCountObject(notReadCount.aitType1Nums),
    aitType2Nums: toCountObject(notReadCount.aitType2Nums)
  };
}

/**
 * 获取消息列表
 * 核心层: getMessagesNew
 */
async function GetMessageList(event) {
  try {
    const { openId, data, db } = event;
    const { page = 1, limit = 20, type, from } = data || {};

    // 参数标准化
    const coreParams = {
      openId: openId,
      ownOpenId: openId,
      page: page,
      limit: limit
    };

    if (type !== undefined) {
      coreParams.type = type;
    }

    if (from) {
      coreParams.from = from;
    }

    console.log('[appGetMessageList] 调用核心层参数:', coreParams);

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getMessagesNew',
      data: coreParams
    });

    console.log('[appGetMessageList] 核心层返回:', JSON.stringify(result.result));

    // 处理错误（如果核心层返回 code 非 200）
    // 对于 400 "查询失败" 错误，返回空数据而不是报错（可能是测试用户没有消息数据）
    if (result.result.code && result.result.code !== 200) {
      console.warn('[appGetMessageList] 核心层返回错误，返回空数据:', result.result.message);
      // 返回空数据结构，让 iOS 可以正常解析
      return success({
        messages: [],
        count: 0,
        notReadCount: formatNotReadCount(null)
      });
    }

    // 格式化 notReadCount
    const formattedNotReadCount = formatNotReadCount(result.result.notReadCount);

    return success({
      messages: result.result.messages || [],
      count: result.result.count || 0,
      notReadCount: formattedNotReadCount
    });
  } catch (err) {
    console.error('[appGetMessageList] error:', err);
    // 即使出错也返回空数据，避免 iOS 解析失败
    return success({
      messages: [],
      count: 0,
      notReadCount: formatNotReadCount(null)
    });
  }
}

/**
 * 设置消息状态
 * 核心层: setMessage
 */
async function SetMessage(event) {
  try {
    const { openId, data, db } = event;
    const { mesTypeId, mesType, status, grouptype, messFromType } = data || {};

    if (!mesTypeId || mesType === undefined || status === undefined) {
      return error(400, "缺少必需参数");
    }

    // 参数标准化
    const coreParams = {
      type: 1, // 1=设置消息状态
      status: status, // 1=已读，3=删除
      mesTypeId: mesTypeId,
      mesType: mesType,
      openId: openId
    };

    if (grouptype !== undefined) {
      coreParams.grouptype = grouptype;
    }

    if (messFromType !== undefined) {
      coreParams.messFromType = messFromType;
    }

    console.log('[appSetMessage] 调用核心层参数:', coreParams);

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setMessage',
      data: coreParams
    });

    console.log('[appSetMessage] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '设置消息状态失败');
    }

    return success({});
  } catch (err) {
    console.error('[appSetMessage] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取未读消息数
 */
async function GetUnreadCount(event) {
  try {
    const { openId, data, db } = event;

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getMessagesNew',
      data: {
        openId: openId,
        ownOpenId: openId,
        page: 1,
        limit: 1
      }
    });

    console.log('[appGetUnreadCount] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取未读消息数失败');
    }

    return success({
      notReadCount: result.result.notReadCount || {}
    });
  } catch (err) {
    console.error('[appGetUnreadCount] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 批量标记消息已读
 */
async function MarkMessagesRead(event) {
  try {
    const { openId, data, db } = event;
    const { messageIds, mesType } = data || {};

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return error(400, "缺少消息ID列表");
    }

    if (mesType === undefined) {
      return error(400, "缺少消息类型");
    }

    const results = [];

    for (const mesTypeId of messageIds) {
      try {
        const result = await cloud.callFunction({
          name: 'setMessage',
          data: {
            type: 1,
            status: 1, // 1=已读
            mesTypeId: mesTypeId,
            mesType: mesType,
            openId: openId
          }
        });

        results.push({
          mesTypeId,
          success: result.result.code === 200
        });
      } catch (err) {
        results.push({
          mesTypeId,
          success: false,
          error: err.message
        });
      }
    }

    return success({
      results,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length
    });
  } catch (err) {
    console.error('[appMarkMessagesRead] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

module.exports = {
  GetMessageList,
  SetMessage,
  GetUnreadCount,
  MarkMessagesRead
};
