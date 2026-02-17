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

      // 返回与 iOS UserProfile 及云函数 GetCurrentUserProfile 一致的字段名
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
