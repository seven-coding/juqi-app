/**
 * 消息服务
 * 直连数据库查询消息和未读数
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CloudbaseService } from '../cloudbase/cloudbase.service';
import { transformMessageCount, toInt } from '../../utils/data-transformer';

/** 未读消息统计参数 */
export interface GetUnreadCountParams {
  /** 用户 openId */
  openId: string;
  /** 数据环境 */
  dataEnv?: string;
}

/** 消息列表查询参数 */
export interface GetMessageListParams {
  /** 用户 openId */
  openId: string;
  /** 消息类型：1=点赞, 2=评论, 3=关注, 4=系统 */
  type?: number;
  /** 分页大小 */
  pageSize?: number;
  /** 分页偏移 */
  offset?: number;
  /** 数据环境 */
  dataEnv?: string;
}

/** 私信列表查询参数 */
export interface GetChatListParams {
  /** 用户 openId */
  openId: string;
  /** 分页大小 */
  pageSize?: number;
  /** 分页偏移 */
  offset?: number;
  /** 数据环境 */
  dataEnv?: string;
}

@Injectable()
export class MessageService {
  constructor(
    private databaseService: DatabaseService,
    private cloudbaseService: CloudbaseService,
  ) {}

  /**
   * 获取未读消息数量（直连数据库）
   * 替代 getMessagesNew 云函数中的未读计数逻辑
   */
  async getUnreadCount(params: GetUnreadCountParams): Promise<any> {
    const { openId, dataEnv = 'test' } = params;

    console.log(`[MessageService] getUnreadCount - openId: ${openId}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      // 并行查询各类未读消息数
      const [
        likeCountResult,
        commentCountResult,
        fansCountResult,
        systemCountResult,
      ] = await Promise.all([
        // 点赞消息
        db.collection('message').where({
          toOpenId: openId,
          type: 1, // 点赞
          isRead: _.neq(true),
        }).count(),
        // 评论消息
        db.collection('message').where({
          toOpenId: openId,
          type: 2, // 评论
          isRead: _.neq(true),
        }).count(),
        // 新粉丝消息
        db.collection('message').where({
          toOpenId: openId,
          type: 3, // 关注
          isRead: _.neq(true),
        }).count(),
        // 系统消息
        db.collection('message').where({
          toOpenId: openId,
          type: 4, // 系统
          isRead: _.neq(true),
        }).count(),
      ]);

      // 查询未读私信数
      const chatCountResult = await db.collection('chat').where({
        $or: [
          { openId: openId },
          { toOpenId: openId },
        ],
      }).orderBy('updateTime', 'desc').limit(100).get();

      // 计算未读私信数（需要更复杂的逻辑，这里简化处理）
      let chatUnreadCount = 0;
      (chatCountResult.data || []).forEach((chat: any) => {
        if (chat.toOpenId === openId && chat.unreadCount) {
          chatUnreadCount += toInt(chat.unreadCount);
        }
      });

      // 返回格式化的未读数统计
      return transformMessageCount({
        likeNums: { total: likeCountResult.total || 0 },
        commentNums: { total: commentCountResult.total || 0 },
        fansNums: { total: fansCountResult.total || 0 },
        chargeNums: { total: chatUnreadCount }, // 私信数
        applyNums: { total: systemCountResult.total || 0 }, // 系统消息
      });
    } catch (error) {
      console.error('[MessageService] getUnreadCount error:', error);
      throw error;
    }
  }

  /**
   * 获取消息列表（直连数据库）
   */
  async getMessageList(params: GetMessageListParams): Promise<any> {
    const {
      openId,
      type,
      pageSize = 20,
      offset = 0,
      dataEnv = 'test',
    } = params;

    console.log(`[MessageService] getMessageList - openId: ${openId}, type: ${type}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);

      // 构造查询条件
      const query: any = {
        toOpenId: openId,
      };
      if (type !== undefined) {
        query.type = type;
      }

      // 查询消息列表
      const result = await db
        .collection('message')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(offset)
        .limit(pageSize + 1)
        .get();

      const messages = result.data || [];
      const hasMore = messages.length > pageSize;
      if (hasMore) {
        messages.pop();
      }

      // 批量获取发送者用户信息
      const senderOpenIds = [...new Set(messages.map((m: any) => m.fromOpenId).filter(Boolean))] as string[];
      const userMap = await this.getUserMap(senderOpenIds, dataEnv);

      // 组装数据
      const list = messages.map((msg: any) => {
        const sender = userMap.get(msg.fromOpenId) || {};
        return {
          id: msg._id,
          type: toInt(msg.type),
          content: msg.content || '',
          dynId: msg.dynId || '',
          fromOpenId: msg.fromOpenId || '',
          fromUserInfo: {
            nickName: sender.nickName || '',
            avatar: sender.avatar || '',
          },
          isRead: msg.isRead || false,
          createTime: msg.createTime || '',
        };
      });

      return { list, hasMore };
    } catch (error) {
      console.error('[MessageService] getMessageList error:', error);
      throw error;
    }
  }

  /**
   * 获取私信会话列表（直连数据库）
   */
  async getChatList(params: GetChatListParams): Promise<any> {
    const {
      openId,
      pageSize = 20,
      offset = 0,
      dataEnv = 'test',
    } = params;

    console.log(`[MessageService] getChatList - openId: ${openId}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      // 查询与当前用户相关的会话
      const result = await db
        .collection('chat')
        .where(_.or([
          { openId: openId },
          { toOpenId: openId },
        ]))
        .orderBy('updateTime', 'desc')
        .skip(offset)
        .limit(pageSize + 1)
        .get();

      const chats = result.data || [];
      const hasMore = chats.length > pageSize;
      if (hasMore) {
        chats.pop();
      }

      // 获取对方用户信息
      const otherOpenIds = [...new Set(
        chats.map((c: any) => c.openId === openId ? c.toOpenId : c.openId).filter(Boolean)
      )] as string[];
      const userMap = await this.getUserMap(otherOpenIds, dataEnv);

      // 组装数据
      const list = chats.map((chat: any) => {
        const otherOpenId = chat.openId === openId ? chat.toOpenId : chat.openId;
        const otherUser = userMap.get(otherOpenId) || {};
        const isReceiver = chat.toOpenId === openId;

        return {
          id: chat._id,
          otherOpenId,
          otherUserInfo: {
            nickName: otherUser.nickName || '',
            avatar: otherUser.avatar || '',
          },
          lastMessage: chat.lastMessage || '',
          unreadCount: isReceiver ? toInt(chat.unreadCount) : 0,
          updateTime: chat.updateTime || '',
        };
      });

      return { list, hasMore };
    } catch (error) {
      console.error('[MessageService] getChatList error:', error);
      throw error;
    }
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(
    openId: string,
    messageIds: string[],
    dataEnv: string = 'test',
  ): Promise<boolean> {
    if (!messageIds || messageIds.length === 0) {
      return true;
    }

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      await db.collection('message').where({
        _id: _.in(messageIds),
        toOpenId: openId,
      }).update({
        isRead: true,
        readTime: new Date(),
      });

      return true;
    } catch (error) {
      console.error('[MessageService] markAsRead error:', error);
      throw error;
    }
  }

  /**
   * 批量获取用户信息
   */
  private async getUserMap(
    openIds: string[],
    dataEnv: string,
  ): Promise<Map<string, any>> {
    if (!openIds || openIds.length === 0) {
      return new Map();
    }

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      const result = await db
        .collection('user')
        .where({
          openId: _.in(openIds),
        })
        .field({
          openId: true,
          nickName: true,
          avatar: true,
        })
        .get();

      const map = new Map<string, any>();
      (result.data || []).forEach((u: any) => {
        map.set(u.openId, u);
      });

      return map;
    } catch (error) {
      console.error('[MessageService] getUserMap error:', error);
      return new Map();
    }
  }
}
