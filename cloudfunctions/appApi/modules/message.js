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
 * 将 getMessagesNew 聚合结果格式化为 iOS Message 模型期望的顶层字段
 * 核心层返回的是 DB 聚合结构：user/userInfo 在数组里，无顶层 fromName/fromPhoto
 */
function toId(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v.$oid) return v.$oid;
  if (typeof v === 'object' && v.id) return String(v.id);
  return String(v);
}

function formatMessagesForApp(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) return rawMessages;
  return rawMessages.map((m) => {
    const user = (m.user && m.user[0]) || (m.userInfo && m.userInfo[0]) || {};
    const msgInfo = (m.messageInfo && m.messageInfo[0]) || {};
    const id = toId(m._id);
    return {
      _id: id,
      from: m.from || '',
      fromName: user.nickName ?? '',
      fromPhoto: user.avatar ?? user.photo ?? null,
      type: m.type ?? m.groupType ?? 0,
      message: m.message ?? msgInfo.message ?? null,
      msgText: m.msgText ?? msgInfo.message ?? m.message ?? null,
      createTime: m.createTime,
      formatDate: m.formatDate ?? null,
      status: m.status ?? 0,
      noReadCount: m.noReadCount ?? 0,
      groupType: m.groupType ?? null,
      groupId: m.groupId ?? null,
      url: m.url ?? null,
      chatId: m.chatId ?? null,
      dynId: m.dynId != null ? toId(m.dynId) : null,
      user: m.user,
      circles: m.circles,
      userInfo: m.userInfo,
      messageInfo: m.messageInfo,
      riskControlReason: m.riskControlReason ?? null
    };
  });
}

/**
 * 获取消息列表
 * 核心层: getMessagesNew
 */
function maskOpenId(openId) {
  if (!openId || typeof openId !== 'string') return 'nil';
  if (openId.length <= 4) return '****';
  return '****' + openId.slice(-4);
}

async function GetMessageList(event) {
  try {
    const { openId, data, db, dataEnv } = event;
    const { page = 1, limit = 20, type, from, aitType, skipNotReadCount } = data || {};

    // 传参日志：ID 与关键参数，便于排查“无数据”是否与 openId 有关
    console.log('[appGetMessageList] 传参 openId=', maskOpenId(openId), ', openId类型=', typeof openId, ', 长度=', (openId && openId.length) || 0, ', 空=', !openId || openId === '');
    console.log('[appGetMessageList] 传参 dataEnv=', dataEnv || 'test', ', page=', page, ', limit=', limit, ', type=', type !== undefined ? type : 'nil(首屏)', ', from=', from || 'nil', ', aitType=', aitType !== undefined ? aitType : 'nil');

    // 参数标准化（含 dataEnv：测试环境函数读线上数据时传 dataEnv=prod）
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

    if (aitType !== undefined) {
      coreParams.aitType = aitType;
    }

    if (dataEnv) {
      coreParams.dataEnv = dataEnv;
    }

    if (skipNotReadCount === true) {
      coreParams.skipNotReadCount = true;
    }

    // 调用核心层前打印（openId 已脱敏）
    const coreParamsLog = { ...coreParams, openId: maskOpenId(coreParams.openId), ownOpenId: maskOpenId(coreParams.ownOpenId) };
    console.log('[appGetMessageList] 调用核心层 coreParams(脱敏):', JSON.stringify(coreParamsLog));

    // 调用核心层（getMessagesNew 会根据 dataEnv 切换数据库环境）
    const result = await cloud.callFunction({
      name: 'getMessagesNew',
      data: coreParams
    });

    const rawList = result.result.messages || [];
    const rawCount = result.result.count;
    console.log('[appGetMessageList] 核心层返回 rawMessages.length=', rawList.length, ', count=', rawCount, ', notReadCount=', result.result.notReadCount ? '有' : '无');

    // 核心层返回非 200 时返回可区分错误，便于客户端展示「加载失败/重试」而非「暂无消息」
    if (result.result.code && result.result.code !== 200) {
      console.warn('[appGetMessageList] 核心层返回错误:', result.result.code, result.result.message);
      const reason = (result.result.message || '').toLowerCase().includes('timeout') ? 'timeout' : 'query_fail';
      return error(
        result.result.code || 500,
        result.result.message || '查询失败',
        { reason }
      );
    }

    // 格式化 notReadCount
    const formattedNotReadCount = formatNotReadCount(result.result.notReadCount);
    const rawMessages = result.result.messages || [];
    const messages = formatMessagesForApp(rawMessages);
    console.log('[appGetMessageList] 格式化后条数:', messages.length, ', 原始条数:', rawMessages.length, ', 返回 count=', result.result.count || 0);

    return success({
      messages,
      count: result.result.count || 0,
      notReadCount: formattedNotReadCount
    });
  } catch (err) {
    console.error('[appGetMessageList] error:', err);
    const reason = (err.message || '').toLowerCase().includes('timeout') ? 'timeout' : 'request_failed';
    return error(500, err.message || '服务器错误', { reason });
  }
}

/**
 * 设置消息状态
 * 核心层: setMessage
 */
async function SetMessage(event) {
  try {
    const { openId, data, db, dataEnv } = event;
    const { mesTypeId, mesType, status, grouptype, messFromType } = data || {};

    if (!mesTypeId || mesType === undefined || status === undefined) {
      return error(400, "缺少必需参数");
    }

    // 参数标准化（含 dataEnv：与 getMessagesNew 一致，写库环境）
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

    if (dataEnv) {
      coreParams.dataEnv = dataEnv;
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
    const { openId, data, db, dataEnv } = event;

    console.log('[appGetUnreadCount] 入参 openId(尾4)=', maskOpenId(openId), ', dataEnv=', dataEnv || 'test');

    const coreParams = {
      openId: openId,
      ownOpenId: openId,
      page: 1,
      limit: 1
    };
    if (dataEnv) coreParams.dataEnv = dataEnv;

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getMessagesNew',
      data: coreParams
    });

    console.log('[appGetUnreadCount] 核心层返回 notReadCount=', result.result && result.result.notReadCount ? '有' : '无');

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
 * 批量标记消息已读（内部循环调用 setMessage，传 dataEnv 保证写库环境一致）
 */
async function MarkMessagesRead(event) {
  try {
    const { openId, data, dataEnv } = event;
    const { messageIds, mesType } = data || {};

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return error(400, "缺少消息ID列表");
    }

    if (mesType === undefined) {
      return error(400, "缺少消息类型");
    }

    const results = [];
    const coreBase = {
      type: 1,
      status: 1, // 1=已读
      mesType,
      openId
    };
    if (dataEnv) coreBase.dataEnv = dataEnv;

    for (const mesTypeId of messageIds) {
      try {
        const result = await cloud.callFunction({
          name: 'setMessage',
          data: { ...coreBase, mesTypeId }
        });

        results.push({
          mesTypeId,
          success: result.result && result.result.code === 200
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
