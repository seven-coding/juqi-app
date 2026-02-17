// 消息模块
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');
const { getFuncName } = require('../utils/env');

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
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db, dataEnv } = event;
    const { page = 1, limit = 20, type, from, aitType, skipNotReadCount } = data || {};

    console.log(`[reqId=${reqId}][appGetMessageList] 入参: dataEnv=${dataEnv || 'test'}, page=${page}, limit=${limit}, type=${type !== undefined ? type : 'nil'}`);

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
    coreParams.requestId = event.requestId || '';

    // 调用核心层（getMessagesNew 会根据 dataEnv 切换数据库环境）
    const result = await cloud.callFunction({
      name: getFuncName('getMessagesNew'),
      data: coreParams
    });

    const rawList = result.result.messages || [];
    const rawCount = result.result.count;

    // 核心层返回非 200 时返回可区分错误，便于客户端展示「加载失败/重试」而非「暂无消息」
    if (result.result.code && result.result.code !== 200) {
      console.warn(`[reqId=${reqId}][appGetMessageList] 错误: code=${result.result.code}, message=${result.result.message}`);
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
    console.log(`[reqId=${reqId}][appGetMessageList] 返回: code=200, messagesCount=${messages.length}, count=${result.result.count || 0}`);

    return success({
      messages,
      count: result.result.count || 0,
      notReadCount: formattedNotReadCount
    });
  } catch (err) {
    console.error(`[reqId=${reqId}][appGetMessageList] 错误:`, err.message, err.stack);
    const reason = (err.message || '').toLowerCase().includes('timeout') ? 'timeout' : 'request_failed';
    return error(500, err.message || '服务器错误', { reason });
  }
}

/**
 * 设置消息状态
 * 核心层: setMessage
 */
async function SetMessage(event) {
  const reqId = event.requestId || '-';
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
      openId: openId,
      requestId: event.requestId || ''
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
      name: getFuncName('setMessage'),
      data: coreParams
    });

    console.log('[appSetMessage] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '设置消息状态失败');
    }

    return success({});
  } catch (err) {
    console.error(`[reqId=${reqId}][appSetMessage] 错误:`, err.message, err.stack);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取未读消息数
 */
async function GetUnreadCount(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db, dataEnv } = event;

    const coreParams = {
      openId: openId,
      ownOpenId: openId,
      page: 1,
      limit: 1,
      requestId: event.requestId || ''
    };
    if (dataEnv) coreParams.dataEnv = dataEnv;

    // 调用核心层
    const result = await cloud.callFunction({
      name: getFuncName('getMessagesNew'),
      data: coreParams
    });

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取未读消息数失败');
    }

    return success({
      notReadCount: result.result.notReadCount || {}
    });
  } catch (err) {
    console.error(`[reqId=${reqId}][appGetUnreadCount] 错误:`, err.message, err.stack);
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
      openId,
      requestId: event.requestId || ''
    };
    if (dataEnv) coreBase.dataEnv = dataEnv;

    for (const mesTypeId of messageIds) {
      try {
        const result = await cloud.callFunction({
          name: getFuncName('setMessage'),
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

/**
 * 申请/私信对话页：拉取 messageChat 集合（type 20-23 对话）
 * 入参: chatOpenId, chatId, messageTypeId(可选), page, limit
 */
async function GetChatMessages(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db, dataEnv } = event;
    const { chatOpenId, chatId: inputChatId, messageTypeId, page = 1, limit = 20 } = data || {};
    const _ = db.command;

    if (!openId) {
      return error(401, '未登录');
    }

    const chatId = inputChatId;
    if (!chatId) {
      return error(400, '缺少 chatId（从首屏消息项带入）');
    }

    if (messageTypeId) {
      try {
        await db.collection('messagesType').doc(messageTypeId).update({
          data: { status: 1 }
        });
      } catch (_) { /* ignore */ }
    }

    // 按 chatId + 当前用户为 from 或 to 查询，不依赖 readList，避免有对话却列表为空
    const chatCondition = _.and([
      { chatId },
      _.or([{ from: openId }, { to: openId }])
    ]);
    const countRes = await db.collection('messageChat').where(chatCondition).count();

    const aggRes = await db.collection('messageChat').aggregate()
      .match(chatCondition)
      .sort({ createTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .end();

    const rawList = aggRes.list || [];
    const messages = formatChatMessagesForApp(rawList);

    return success({
      messages,
      count: countRes.total || 0
    });
  } catch (err) {
    console.error(`[reqId=${reqId}][appGetChatMessages] 错误:`, err.message, err.stack);
    return error(500, err.message || '查询失败');
  }
}

/**
 * 申请/私信对话页：发送一条消息到 messageChat
 * 入参: to(对方openId), message(文本或图片URL), chatId, contentType(可选 1=文字 2=图片)
 */
async function SendChatMessage(event) {
  const reqId = event.requestId || '-';
  try {
    const { openId, data, db } = event;
    const { to, message: rawMessage, chatId, contentType: rawContentType } = data || {};
    const contentType = rawContentType === 2 ? 2 : 1;

    if (!openId) {
      return error(401, '未登录');
    }
    if (!chatId || !to) {
      return error(400, '缺少 chatId 或 to');
    }
    const message = typeof rawMessage === 'string' ? (contentType === 2 ? rawMessage.trim() : rawMessage.trim()) : '';
    if (!message) {
      return error(400, contentType === 2 ? '图片地址不能为空' : '消息内容不能为空');
    }

    const userRes = await db.collection('user').where({ openId }).limit(1).get();
    const fromUser = (userRes.data && userRes.data[0]) || {};
    const fromName = fromUser.nickName ?? '';
    const fromPhoto = fromUser.avatarVisitUrl ?? fromUser.avatarUrl ?? null;

    const now = Date.now();
    await db.collection('messageChat').add({
      data: {
        chatId,
        from: openId,
        to,
        readList: [openId, to],
        message,
        firstMes: message,
        secondMes: message,
        fromName,
        fromPhoto,
        createTime: now,
        type: 20,
        contentType,
        status: 0
      }
    });

    // 确保接收方首屏有该会话入口：为 to 写入/更新 messagesType（与 GetChatId 一致）
    const _ = db.command;
    const typeRow = await db.collection('messagesType').where({
      to,
      from: openId,
      groupType: openId,
      status: _.in([0, 1])
    }).get();
    const lastMsg = (contentType === 2 ? '[图片]' : message) || '发消息';
    if (typeRow.data && typeRow.data.length > 0) {
      await db.collection('messagesType').where({
        to,
        from: openId,
        groupType: openId,
        status: _.in([0, 1])
      }).update({
        data: {
          chatId,
          createTime: now,
          fromName,
          fromPhoto,
          message: lastMsg
        }
      });
    } else {
      await db.collection('messagesType').add({
        data: {
          from: openId,
          to,
          groupType: openId,
          status: 0,
          noReadCount: 1,
          createTime: now,
          messageUserId: null,
          type: 20,
          fromName,
          fromPhoto,
          message: lastMsg,
          chatId
        }
      });
    }

    return success({ code: 200 });
  } catch (err) {
    console.error(`[reqId=${reqId}][appSendChatMessage] 错误:`, err.message, err.stack);
    return error(500, err.message || '发送失败');
  }
}

function formatChatMessagesForApp(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((m) => {
    const id = m._id != null ? (typeof m._id === 'string' ? m._id : m._id.id || String(m._id)) : '';
    let msgText = m.message ?? m.content ?? m.secondMes ?? '';
    if (m.firstMes && (m.type === 20 || m.type === 21 || m.type === 22)) {
      msgText = `【 ${m.firstMes} 】` + (m.secondMes ?? '');
    } else if (m.type === 23 && m.firstMes) {
      msgText = m.firstMes;
    }
    return {
      _id: id,
      from: m.from ?? '',
      fromName: m.fromName ?? '',
      fromPhoto: m.fromPhoto ?? null,
      type: m.type ?? 0,
      message: m.message ?? m.content ?? m.secondMes ?? null,
      msgText,
      createTime: m.createTime ?? null,
      formatDate: null,
      status: m.status ?? 0,
      noReadCount: m.noReadCount ?? 0,
      groupType: null,
      groupId: null,
      url: null,
      chatId: m.chatId ?? null,
      dynId: null,
      user: null,
      circles: null,
      userInfo: null,
      messageInfo: null,
      riskControlReason: null,
      contentType: m.contentType ?? 1
    };
  });
}

module.exports = {
  GetMessageList,
  SetMessage,
  GetUnreadCount,
  MarkMessagesRead,
  GetChatMessages,
  SendChatMessage
};
