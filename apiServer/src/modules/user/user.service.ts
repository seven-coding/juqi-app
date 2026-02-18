/**
 * 用户服务
 * 直连数据库查询用户信息
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CloudbaseService } from '../cloudbase/cloudbase.service';
import { transformUserProfile, toInt, toBool, toValidEnum } from '../../utils/data-transformer';

/** 用户 Profile 查询参数 */
export interface GetUserProfileParams {
  /** 用户 openId */
  openId: string;
  /** 数据环境 */
  dataEnv?: string;
  /** 当前登录用户 openId（用于判断关注状态等） */
  currentOpenId?: string;
}

@Injectable()
export class UserService {
  constructor(
    private databaseService: DatabaseService,
    private cloudbaseService: CloudbaseService,
  ) {}

  /**
   * 获取当前用户 Profile（直连数据库）
   * 替代 appGetCurrentUserProfile 云函数
   */
  async getCurrentUserProfile(params: GetUserProfileParams): Promise<any> {
    const { openId, dataEnv = 'test' } = params;

    console.log(`[UserService] getCurrentUserProfile - openId: ${openId}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      // 查询用户基本信息
      const userResult = await db
        .collection('user')
        .where({ openId })
        .limit(1)
        .get();

      const user = userResult.data?.[0];
      if (!user) {
        console.log(`[UserService] User not found: ${openId}`);
        return null;
      }

      // 并行查询统计数据（集合名与云函数 appApiV201/user.js 一致：user_followee、dynFavorite、user_black）
      const [
        followCountResult,
        followerCountResult,
        dynCountResult,
        collectionCountResult,
        blockedCountResult,
      ] = await Promise.all([
        db.collection('user_followee').where({ openId, status: 1 }).count(),
        db.collection('user_followee').where({ followeeId: openId, status: 1 }).count(),
        db.collection('dyn').where({ openId }).count(),
        db.collection('dynFavorite').where({ openId, favoriteFlag: '0' }).count(),
        db.collection('user_black').where({ openId }).count(),
      ]);

      // 处理头像 URL
      let avatar = user.avatar || user.avatarVisitUrl || user.avatarUrl || '';
      if (avatar && avatar.startsWith('cloud://')) {
        try {
          const result = await this.cloudbaseService.getTempFileURL([avatar], dataEnv);
          if (result.fileList?.[0]?.tempFileURL) {
            avatar = result.fileList[0].tempFileURL;
          }
        } catch (e) {
          console.error('[UserService] Convert avatar URL error:', e);
        }
      }

      const followCount = followCountResult?.total ?? 0;
      const followerCount = followerCountResult?.total ?? 0;
      const publishCount = dynCountResult?.total ?? user.dynNums ?? user.publishCount ?? 0;
      const collectionCount = collectionCountResult?.total ?? user.collectionCount ?? 0;
      const inviteCount = toInt(user.inviteCount, 0);
      const blockedCount = blockedCountResult?.total ?? user.blockedCount ?? 0;
      const chargeNums = toInt(user.chargeNums ?? user.chargeCount, 0);

      // 返回与 iOS UserProfile 及云函数 GetCurrentUserProfile 一致的字段名（含 ownOpenId 供客户端判断本人）
      const profile = transformUserProfile({
        ...user,
        id: user._id || user.openId,
        avatar,
        followCount,
        followerCount,
        fansCount: followerCount,
        publishCount,
        publishDynCount: publishCount,
        collectionCount,
        collectCount: collectionCount,
        inviteCount,
        blockedCount,
        chargeNums,
      });
      if (profile && typeof profile === 'object') {
        (profile as any).ownOpenId = user.openId;
        (profile as any).isOwnProfile = true;
      }
      return profile;
    } catch (error) {
      console.error('[UserService] getCurrentUserProfile error:', error);
      throw error;
    }
  }

  /**
   * 获取其他用户 Profile
   */
  async getUserProfile(params: GetUserProfileParams): Promise<any> {
    const { openId, dataEnv = 'test', currentOpenId } = params;

    console.log(`[UserService] getUserProfile - openId: ${openId}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      // 查询用户基本信息
      const userResult = await db
        .collection('user')
        .where({ openId })
        .limit(1)
        .get();

      const user = userResult.data?.[0];
      if (!user) {
        return null;
      }

      // 并行查询统计数据和关系状态
      const queries: Promise<any>[] = [
        db.collection('follow').where({ openId, status: 1 }).count(),
        db.collection('follow').where({ followOpenId: openId, status: 1 }).count(),
        db.collection('dyn').where({ openId, dynStatus: 1 }).count(),
      ];

      // 如果有当前用户，查询关注状态和拉黑状态
      if (currentOpenId && currentOpenId !== openId) {
        queries.push(
          db.collection('follow').where({
            openId: currentOpenId,
            followOpenId: openId,
            status: 1,
          }).count(),
          db.collection('blacklist').where({
            openId: currentOpenId,
            blackOpenId: openId,
            status: 1,
          }).count(),
          db.collection('blacklist').where({
            openId: openId,
            blackOpenId: currentOpenId,
            status: 1,
          }).count(),
        );
      }

      const results = await Promise.all(queries);

      const followCount = results[0].total || 0;
      const fansCount = results[1].total || 0;
      const dynCount = results[2].total || 0;

      let isFollowed = false;
      let blackStatus = 1; // 1=normal

      if (currentOpenId && currentOpenId !== openId) {
        isFollowed = (results[3]?.total || 0) > 0;
        const iBlackedOther = (results[4]?.total || 0) > 0;
        const otherBlackedMe = (results[5]?.total || 0) > 0;

        if (iBlackedOther) {
          blackStatus = 2; // 2=blacked
        } else if (otherBlackedMe) {
          blackStatus = 3; // 3=otherBlackedMe
        }
      }

      // 处理头像 URL
      let avatar = user.avatar || '';
      if (avatar && avatar.startsWith('cloud://')) {
        try {
          const result = await this.cloudbaseService.getTempFileURL([avatar], dataEnv);
          if (result.fileList?.[0]?.tempFileURL) {
            avatar = result.fileList[0].tempFileURL;
          }
        } catch (e) {
          console.error('[UserService] Convert avatar URL error:', e);
        }
      }

      // 构造返回数据
      const profile = transformUserProfile({
        ...user,
        id: user._id || user.openId,
        avatar,
        followCount,
        fansCount,
        publishDynCount: dynCount,
        isFollowed,
        blackStatus,
      });

      return profile;
    } catch (error) {
      console.error('[UserService] getUserProfile error:', error);
      throw error;
    }
  }

  /**
   * 将 userId（user 表 _id 或 openId）解析为 openId，供个人主页动态等接口使用
   * 与云函数 appApiV201 resolveUserIdToOpenId 语义一致：24/32 位十六进制视为 _id 查 user 表
   */
  async resolveUserIdToOpenId(userId: string | null | undefined, dataEnv: string = 'test'): Promise<string | null> {
    const pair = await this.getOpenIdAndIdForUser(userId, dataEnv);
    return pair ? pair.openId : (userId || null);
  }

  /**
   * 解析用户标识为 openId + _id，便于 dyn 查询兼容「dyn.openId 存 openId 或存 user._id」两种写法
   */
  async getOpenIdAndIdForUser(
    userId: string | null | undefined,
    dataEnv: string = 'test',
  ): Promise<{ openId: string; _id: string } | null> {
    if (!userId || typeof userId !== 'string') return null;
    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const hex24 = /^[a-fA-F0-9]{24}$/.test(userId);
      const hex32 = /^[a-fA-F0-9]{32}$/.test(userId);
      let doc: any = null;
      if (hex24 || hex32) {
        const res = await db.collection('user').doc(userId).get();
        doc = Array.isArray((res as any).data) ? (res as any).data[0] : (res as any).data;
      } else {
        const res = await db.collection('user').where({ openId: userId }).limit(1).get();
        doc = (res.data && res.data[0]) ? res.data[0] : null;
      }
      if (!doc || !doc.openId) return null;
      const openId = doc.openId;
      const _id = doc._id ?? doc.id ?? '';
      if (openId) console.log('[UserService] getOpenIdAndIdForUser userId=', userId, '-> openId(尾4)=', openId.slice(-4), '_id(尾4)=', String(_id).slice(-4));
      return { openId, _id: String(_id) };
    } catch (e: any) {
      console.warn('[UserService] getOpenIdAndIdForUser 失败 userId=', userId, e?.message);
      return null;
    }
  }

  /** 获取「viewer 是否关注了 target」，与云函数 commonRequestV201 get_follow_status 一致，查 user_followee；超时按未关注 */
  private static FOLLOW_STATUS_TIMEOUT_MS = 2500;

  async getFollowStatus(
    viewerOpenId: string,
    targetOpenId: string,
    dataEnv: string = 'test',
  ): Promise<boolean> {
    if (!viewerOpenId || !targetOpenId || viewerOpenId === targetOpenId) return false;
    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const p = db
        .collection('user_followee')
        .where({ openId: viewerOpenId, followeeId: targetOpenId, status: 1 })
        .limit(1)
        .get();
      const race = await Promise.race([
        p,
        new Promise<{ data: any[] }>((_, reject) =>
          setTimeout(() => reject(new Error('get_follow_status timeout')), UserService.FOLLOW_STATUS_TIMEOUT_MS),
        ),
      ]);
      const list = (race as any).data || [];
      return list.length > 0;
    } catch (e: any) {
      console.warn('[UserService] getFollowStatus timeout or error, treat as not follow:', e?.message);
      return false;
    }
  }

  /**
   * 根据 openId 列表批量获取用户信息
   */
  async getUsersByOpenIds(
    openIds: string[],
    dataEnv: string = 'test',
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
        .get();

      const userMap = new Map<string, any>();
      (result.data || []).forEach((user: any) => {
        userMap.set(user.openId, transformUserProfile(user));
      });

      return userMap;
    } catch (error) {
      console.error('[UserService] getUsersByOpenIds error:', error);
      throw error;
    }
  }
}
