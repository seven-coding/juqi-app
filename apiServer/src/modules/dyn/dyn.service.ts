/**
 * 动态服务
 * 直连数据库查询动态列表
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CloudbaseService } from '../cloudbase/cloudbase.service';
import { transformDynItem, transformUserProfile, toInt, toBool } from '../../utils/data-transformer';

/** 动态列表查询参数 */
export interface GetDynListParams {
  /** 查询类型：1=关注, 2=最新, 3=推荐 */
  type?: number;
  /** 分页大小 */
  pageSize?: number;
  /** 分页偏移 */
  offset?: number;
  /** 数据环境 */
  dataEnv?: string;
  /** 当前用户 openId */
  openId?: string;
}

/** 动态详情查询参数 */
export interface GetDynDetailParams {
  /** 动态 ID */
  dynId: string;
  /** 数据环境 */
  dataEnv?: string;
  /** 当前用户 openId */
  openId?: string;
}

@Injectable()
export class DynService {
  constructor(
    private databaseService: DatabaseService,
    private cloudbaseService: CloudbaseService,
  ) {}

  /**
   * 获取动态列表（直连数据库）
   * 替代 getDynsListV2 云函数的核心逻辑
   */
  async getDynList(params: GetDynListParams): Promise<any> {
    const {
      type = 2,
      pageSize = 10,
      offset = 0,
      dataEnv = 'test',
      openId,
    } = params;

    console.log(`[DynService] getDynList - type: ${type}, pageSize: ${pageSize}, offset: ${offset}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      // 基础查询条件
      const baseQuery: any = {
        dynStatus: 1, // 正常状态
      };

      // 根据类型调整查询
      if (type === 1 && openId) {
        // 关注的人的动态 - 需要先查关注列表
        const followResult = await db
          .collection('follow')
          .where({
            openId: openId,
            status: 1,
          })
          .field({ followOpenId: true })
          .get();

        const followOpenIds = (followResult.data || []).map((f: any) => f.followOpenId);
        if (followOpenIds.length === 0) {
          return { list: [], hasMore: false };
        }
        baseQuery.openId = _.in(followOpenIds);
      }

      // 查询动态列表
      const dynResult = await db
        .collection('dyn')
        .where(baseQuery)
        .orderBy('createTime', 'desc')
        .skip(offset)
        .limit(pageSize + 1) // 多查一条判断是否有更多
        .get();

      const dynList = dynResult.data || [];
      const hasMore = dynList.length > pageSize;
      if (hasMore) {
        dynList.pop(); // 移除多查的一条
      }

      if (dynList.length === 0) {
        return { list: [], hasMore: false };
      }

      // 批量获取用户信息
      const userOpenIds = [...new Set(dynList.map((d: any) => d.openId))];
      const userResult = await db
        .collection('user')
        .where({
          openId: _.in(userOpenIds),
        })
        .get();

      const userMap = new Map<string, any>();
      (userResult.data || []).forEach((u: any) => {
        userMap.set(u.openId, u);
      });

      // 如果有当前用户，查询点赞和收藏状态
      let praiseSet = new Set<string>();
      let collectSet = new Set<string>();

      if (openId) {
        const dynIds = dynList.map((d: any) => d._id);

        // 并行查询点赞和收藏
        const [praiseResult, collectResult] = await Promise.all([
          db
            .collection('praise')
            .where({
              openId: openId,
              dynId: _.in(dynIds),
              status: 1,
            })
            .field({ dynId: true })
            .get(),
          db
            .collection('collect')
            .where({
              openId: openId,
              dynId: _.in(dynIds),
              status: 1,
            })
            .field({ dynId: true })
            .get(),
        ]);

        (praiseResult.data || []).forEach((p: any) => praiseSet.add(p.dynId));
        (collectResult.data || []).forEach((c: any) => collectSet.add(c.dynId));
      }

      // 组装数据
      const list = await Promise.all(
        dynList.map(async (dyn: any) => {
          const userInfo = userMap.get(dyn.openId) || {};

          // 处理图片 URL
          let images = dyn.images || [];
          if (images.length > 0) {
            images = await this.convertCloudUrls(images, dataEnv);
          }

          // 处理用户头像
          let avatar = userInfo.avatar || '';
          if (avatar && avatar.startsWith('cloud://')) {
            const [convertedAvatar] = await this.convertCloudUrls([avatar], dataEnv);
            avatar = convertedAvatar;
          }

          return transformDynItem({
            ...dyn,
            id: dyn._id,
            images,
            isPraised: praiseSet.has(dyn._id),
            isCollected: collectSet.has(dyn._id),
            isOwn: dyn.openId === openId,
            userInfo: transformUserProfile({
              ...userInfo,
              avatar,
            }),
          });
        }),
      );

      return { list, hasMore };
    } catch (error) {
      console.error('[DynService] getDynList error:', error);
      throw error;
    }
  }

  /**
   * 获取动态详情
   */
  async getDynDetail(params: GetDynDetailParams): Promise<any> {
    const { dynId, dataEnv = 'test', openId } = params;

    console.log(`[DynService] getDynDetail - dynId: ${dynId}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);

      // 查询动态
      const dynResult = await db.collection('dyn').doc(dynId).get();
      const dyn = dynResult.data?.[0];

      if (!dyn) {
        return null;
      }

      // 查询用户信息
      const userResult = await db
        .collection('user')
        .where({ openId: dyn.openId })
        .limit(1)
        .get();
      const userInfo = userResult.data?.[0] || {};

      // 查询点赞和收藏状态
      let isPraised = false;
      let isCollected = false;

      if (openId) {
        const [praiseResult, collectResult] = await Promise.all([
          db
            .collection('praise')
            .where({
              openId: openId,
              dynId: dynId,
              status: 1,
            })
            .count(),
          db
            .collection('collect')
            .where({
              openId: openId,
              dynId: dynId,
              status: 1,
            })
            .count(),
        ]);

        isPraised = (praiseResult.total || 0) > 0;
        isCollected = (collectResult.total || 0) > 0;
      }

      // 处理图片 URL
      let images = dyn.images || [];
      if (images.length > 0) {
        images = await this.convertCloudUrls(images, dataEnv);
      }

      // 处理用户头像
      let avatar = userInfo.avatar || '';
      if (avatar && avatar.startsWith('cloud://')) {
        const [convertedAvatar] = await this.convertCloudUrls([avatar], dataEnv);
        avatar = convertedAvatar;
      }

      return transformDynItem({
        ...dyn,
        id: dyn._id,
        images,
        isPraised,
        isCollected,
        isOwn: dyn.openId === openId,
        userInfo: transformUserProfile({
          ...userInfo,
          avatar,
        }),
      });
    } catch (error) {
      console.error('[DynService] getDynDetail error:', error);
      throw error;
    }
  }

  /**
   * 转换 cloud:// URL 为 HTTPS 临时链接
   */
  private async convertCloudUrls(urls: string[], dataEnv: string): Promise<string[]> {
    const cloudUrls = urls.filter((u) => u && u.startsWith('cloud://'));
    if (cloudUrls.length === 0) {
      return urls;
    }

    try {
      const result = await this.cloudbaseService.getTempFileURL(cloudUrls, dataEnv);
      const urlMap = new Map<string, string>();

      (result.fileList || []).forEach((item: any) => {
        if (item.tempFileURL) {
          urlMap.set(item.fileID, item.tempFileURL);
        }
      });

      return urls.map((url) => {
        if (url && url.startsWith('cloud://') && urlMap.has(url)) {
          return urlMap.get(url)!;
        }
        return url;
      });
    } catch (error) {
      console.error('[DynService] convertCloudUrls error:', error);
      return urls; // 转换失败时返回原始 URL
    }
  }
}
