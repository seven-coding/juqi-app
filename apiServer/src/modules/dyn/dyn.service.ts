/**
 * 动态服务
 * 直连数据库查询动态列表
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CloudbaseService } from '../cloudbase/cloudbase.service';
import { UserService } from '../user/user.service';
import { transformDynItem, transformUserProfile, toInt, toBool } from '../../utils/data-transformer';

/** 动态列表查询参数（type 与 getDynsListV201 一致：1=电站, 2=最新, 6=关注, 10=热榜） */
export interface GetDynListParams {
  /** 查询类型：1=电站, 2=最新, 6=关注, 10=热榜 */
  type?: number;
  /** 电站 ID（type=1 时必传） */
  circleId?: string;
  /** 分页大小 */
  pageSize?: number;
  /** 分页偏移 */
  offset?: number;
  /** 数据环境 */
  dataEnv?: string;
  /** 当前用户 openId */
  openId?: string;
  /** 游标分页：上一页最后一条的 publicTime（毫秒） */
  publicTime?: number;
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

/** 充电动态参数 */
export interface ChargeDynParams {
  /** 动态 ID */
  dynId: string;
  /** 当前用户 openId */
  openId: string;
  /** 数据环境 */
  dataEnv?: string;
}

/** 用户个人主页动态列表参数（与 getDynsListV201 type=4 一致） */
export interface GetUserDynListParams {
  /** 被查看用户的 openId（用于 isOwn 判断） */
  targetOpenId: string;
  /** 查询 dyn 时使用的 openId 列表，兼容 dyn.openId 存 openId 或 user._id；为空则仅用 targetOpenId */
  targetOpenIds?: string[];
  /** 当前登录用户 openId（用于 isOwn、点赞/收藏状态） */
  viewerOpenId: string;
  /** 每页条数 */
  limit?: number;
  /** 游标：上一页最后一条的 publicTime */
  publicTime?: number;
  /** 数据环境 */
  dataEnv?: string;
}

@Injectable()
export class DynService {
  constructor(
    private databaseService: DatabaseService,
    private cloudbaseService: CloudbaseService,
    private userService: UserService,
  ) {}

  /**
   * 从文档字段提取时间戳，兼容 number / Date / Mongo $date / 字符串
   * 返回与 DB 可比较的数值，保证游标分页时 _.lt(cursor) 正确
   */
  private extractTimestamp(doc: any, field: string): number | undefined {
    const v = doc?.[field];
    if (v == null) return undefined;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'object' && v.$date != null) {
      const d = v.$date;
      if (typeof d === 'number') return d;
      if (typeof d === 'string') return new Date(d).getTime();
      return undefined;
    }
    if (typeof v === 'string') {
      const ms = new Date(v).getTime();
      return Number.isNaN(ms) ? undefined : ms;
    }
    return undefined;
  }

  /**
   * 获取动态列表（直连数据库）
   * 替代 getDynsListV2 云函数的核心逻辑
   */
  async getDynList(params: GetDynListParams): Promise<any> {
    const {
      type = 2,
      circleId,
      pageSize = 10,
      offset = 0,
      dataEnv = 'test',
      openId,
      publicTime: cursorTime,
    } = params;

    console.log(`[DynService] getDynList - type: ${type}, circleId: ${circleId ?? '-'}, pageSize: ${pageSize}, offset: ${offset}, dataEnv: ${dataEnv}`);

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      let baseQuery: any;
      let orderBy: string;
      let sortOrder: 'asc' | 'desc';

      if (type === 1 && circleId) {
        // 电站动态：dynStatus 与小程序统一 1=全部可见 2=仅圈子/树洞可见，树洞兼容 [1,2]
        baseQuery = {
          circleId,
          dynStatus: _.in([1, 2]),
          hiddenStatus: _.neq(1),
          isDelete: _.neq(1),
        };
        if (cursorTime != null) {
          baseQuery.publicTime = _.lt(cursorTime);
        }
        orderBy = 'publicTime';
        sortOrder = 'desc';
      } else if (type === 6) {
        // 关注：与 getFollowDyns 一致，从 user_followee 取 followeeId，再查这些人的动态
        if (!openId) {
          return { list: [], hasMore: false, publicTime: undefined };
        }
        const followResult = await db
          .collection('user_followee')
          .where({ openId, status: 1 })
          .limit(1000)
          .field({ followeeId: true })
          .get();
        const followeeIds = (followResult.data || []).map((f: any) => f.followeeId);
        if (followeeIds.length === 0) {
          return { list: [], hasMore: false, publicTime: undefined };
        }
        baseQuery = {
          openId: _.in(followeeIds),
          dynStatus: _.in([1, 3, 6, 7, 9]),
          hiddenStatus: _.neq(1),
          isDelete: _.neq(1),
        };
        if (cursorTime != null) {
          baseQuery.publicTime = _.lt(cursorTime);
        }
        orderBy = 'publicTime';
        sortOrder = 'desc';
      } else if (type === 10) {
        // 热榜：与 getHotList 一致，近 8 小时、排除转发、按点赞数降序
        const eightHoursAgo = Date.now() - 8 * 60 * 60 * 1000;
        baseQuery = {
          publicTime: _.gt(eightHoursAgo),
          dynStatus: 1,
          dynType: _.neq(2), // 排除转发
          hiddenStatus: _.neq(1),
          isDelete: _.neq(1),
        };
        orderBy = 'likeNums';
        sortOrder = 'desc';
      } else {
        // type === 2 最新/首页：仅 1/6 展示，排除 2（仅圈子/树洞可见）
        baseQuery = {
          dynStatus: _.in([1, 6]),
          hiddenStatus: _.neq(1),
          isDelete: _.neq(1),
        };
        if (cursorTime != null) {
          baseQuery.publicTime = _.lt(cursorTime);
        }
        orderBy = 'publicTime';
        sortOrder = 'desc';
      }

      const dynResult = await db
        .collection('dyn')
        .where(baseQuery)
        .orderBy(orderBy, sortOrder)
        .skip(offset)
        .limit(pageSize + 1)
        .get();

      let dynList = dynResult.data || [];
      // 首页不展示树洞帖（dynStatus=2 仅圈子内可见）
      if (type === 2) {
        dynList = dynList.filter((d: any) => d.dynStatus !== 2);
      }
      const hasMore = dynList.length > pageSize;
      if (hasMore) {
        dynList.pop();
      }

      if (dynList.length === 0) {
        return { list: [], hasMore: false, publicTime: undefined };
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

      const lastDyn = dynList[dynList.length - 1];
      const lastPublicTime = this.extractTimestamp(lastDyn, 'publicTime') ?? this.extractTimestamp(lastDyn, 'createTime') ?? undefined;

      return { list, hasMore, publicTime: lastPublicTime };
    } catch (error) {
      console.error('[DynService] getDynList error:', error);
      throw error;
    }
  }

  /**
   * 获取用户个人主页动态列表（直连，与 getDynsListV201 getUserDyns 规则一致）
   * 主态：dynStatus 排除 2、5（_.nin([2,5])）；客态：先查关注关系，已关注 _.in([0,1,3,6,7,9])，未关注 _.in([0,1,3,6,7])
   */
  async getUserDynList(params: GetUserDynListParams): Promise<{ list: any[]; hasMore: boolean; publicTime?: number }> {
    const {
      targetOpenId,
      targetOpenIds,
      viewerOpenId,
      limit = 20,
      publicTime: cursorTime,
      dataEnv = 'test',
    } = params;

    const queryIds = targetOpenIds?.length ? targetOpenIds : [targetOpenId];
    const openIdCond = queryIds.length === 1 ? queryIds[0] : _.in(queryIds);

    console.log(
      `[DynService] getUserDynList - targetOpenId(尾4): ${targetOpenId?.slice(-4) ?? '-'}, queryIds.count: ${queryIds.length}, viewerOpenId(尾4): ${viewerOpenId?.slice(-4) ?? '-'}, limit: ${limit}, dataEnv: ${dataEnv}`,
    );

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      const isOwn = targetOpenId === viewerOpenId;
      let dynStatusCond: any;
      // 规则与小程序一致；同时匹配数字与字符串，避免库中 dynStatus 存为字符串导致 0 条
      if (isOwn) {
        dynStatusCond = _.nin([2, 5, '2', '5']);
      } else {
        const ifFollow = await this.userService.getFollowStatus(viewerOpenId, targetOpenId, dataEnv);
        const allowedGuest = ifFollow ? [0, 1, 3, 6, 7, 9] : [0, 1, 3, 6, 7];
        dynStatusCond = _.in([...allowedGuest, ...allowedGuest.map(String)]);
      }

      const baseQuery: any = {
        openId: openIdCond,
        dynStatus: dynStatusCond,
        isDelete: _.neq(1),
      };
      if (cursorTime != null) {
        baseQuery.publicTime = _.lt(cursorTime);
      }

      const dynResult = await db
        .collection('dyn')
        .where(baseQuery)
        .orderBy('publicTime', 'desc')
        .limit(limit + 1)
        .get();

      let dynList = dynResult.data || [];
      console.log(`[DynService] getUserDynList dyn query result length=${dynList.length}, isOwn=${isOwn}, targetOpenId(尾4)=${targetOpenId?.slice(-4)}`);
      const hasMore = dynList.length > limit;
      if (hasMore) dynList.pop();

      if (dynList.length === 0) {
        return { list: [], hasMore: false, publicTime: undefined };
      }

      const userOpenIds = [...new Set(dynList.map((d: any) => d.openId))];
      const userResult = await db
        .collection('user')
        .where({ openId: _.in(userOpenIds) })
        .get();
      const userMap = new Map<string, any>();
      (userResult.data || []).forEach((u: any) => userMap.set(u.openId, u));

      let praiseSet = new Set<string>();
      let collectSet = new Set<string>();
      if (viewerOpenId) {
        const dynIds = dynList.map((d: any) => d._id);
        const [praiseResult, collectResult] = await Promise.all([
          db.collection('praise').where({ openId: viewerOpenId, dynId: _.in(dynIds), status: 1 }).field({ dynId: true }).get(),
          db.collection('collect').where({ openId: viewerOpenId, dynId: _.in(dynIds), status: 1 }).field({ dynId: true }).get(),
        ]);
        (praiseResult.data || []).forEach((p: any) => praiseSet.add(p.dynId));
        (collectResult.data || []).forEach((c: any) => collectSet.add(c.dynId));
      }

      const list = await Promise.all(
        dynList.map(async (dyn: any) => {
          const userInfo = userMap.get(dyn.openId) || {};
          let images = dyn.images || [];
          if (images.length > 0) images = await this.convertCloudUrls(images, dataEnv);
          let avatar = userInfo.avatar || '';
          if (avatar && avatar.startsWith('cloud://')) {
            const [converted] = await this.convertCloudUrls([avatar], dataEnv);
            avatar = converted;
          }
          const like = dyn.like || [];
          const isChargedFromLike = !!(viewerOpenId && Array.isArray(like) && like.includes(viewerOpenId));
          return transformDynItem({
            ...dyn,
            id: dyn._id,
            images,
            isPraised: praiseSet.has(dyn._id) || isChargedFromLike,
            isCollected: collectSet.has(dyn._id),
            isOwn: dyn.openId === viewerOpenId,
            likeNums: dyn.likeNums ?? 0,
            isCharged: isChargedFromLike,
            userInfo: transformUserProfile({ ...userInfo, avatar }),
          });
        }),
      );

      const lastDyn = dynList[dynList.length - 1];
      const lastPublicTime = this.extractTimestamp(lastDyn, 'publicTime') ?? this.extractTimestamp(lastDyn, 'createTime') ?? undefined;
      return { list, hasMore, publicTime: lastPublicTime };
    } catch (error) {
      console.error('[DynService] getUserDynList error:', error);
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

      // 与列表一致：用 where + limit(1)，返回的 data 恒为数组，避免 doc().get() 格式歧义
      const dynResult = await db
        .collection('dyn')
        .where({ _id: dynId })
        .limit(1)
        .get();
      const dyn = (dynResult.data || [])[0];

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

      // 充电=点赞，数据存在 dyn.like 中；若 praise 表无记录但 dyn.like 含当前用户，也视为已充电/已点赞
      const like = dyn.like || [];
      const likeNums = dyn.likeNums ?? 0;
      const isChargedFromLike = !!(openId && Array.isArray(like) && like.includes(openId));
      if (isChargedFromLike) {
        isPraised = true;
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
        likeNums,
        isCharged: isChargedFromLike,
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
   * 充电动态（直连，与列表/详情同库，避免云函数查不到 doc）
   * 充电与点赞共用 like 数组与 likeNums
   */
  async chargeDyn(params: ChargeDynParams): Promise<{ code: number; message?: string; data?: any }> {
    const { dynId, openId, dataEnv = 'test' } = params;

    try {
      const db = this.databaseService.getDatabase(dataEnv);
      const _ = db.command;

      const dynResult = await db.collection('dyn').doc(dynId).get();
      // SDK 在 API 报错时返回 { code, message }，data 可能为空
      if (dynResult && typeof (dynResult as any).code !== 'undefined' && (dynResult as any).code !== 0) {
        const errMsg = (dynResult as any).message || '获取动态失败';
        console.error('[DynService] chargeDyn get doc error:', dynResult);
        return { code: 500, message: errMsg };
      }
      const dyn = Array.isArray(dynResult.data) ? dynResult.data[0] : dynResult.data;

      if (!dyn) {
        return { code: 404, message: '动态不存在' };
      }

      const like = dyn.like || [];
      const likeNums = dyn.likeNums ?? 0;
      if (like.includes(openId)) {
        return { code: 200, message: 'success', data: { isLiked: true, likeNums, chargeCount: likeNums } };
      }

      if (dyn.isDelete === 1) {
        return { code: 400, message: '帖子已被删除' };
      }
      if (dyn.riskControlLevel === 3 || dyn.riskControlLevel === 4) {
        return { code: 400, message: '帖子已被风控' };
      }

      // 直接更新 dyn 文档的 like、likeNums（与点赞同库同字段）；update 传字段对象，不能包在 data 里
      const ok = await this.databaseService.updateById(
        'dyn',
        dynId,
        {
          like: _.push(openId),
          likeNums: _.inc(1),
        },
        dataEnv,
      );

      if (!ok) {
        return { code: 500, message: '更新失败' };
      }

      return {
        code: 200,
        message: 'success',
        data: { isLiked: true, likeNums: likeNums + 1, chargeCount: likeNums + 1 },
      };
    } catch (error: any) {
      console.error('[DynService] chargeDyn error:', error);
      const message = error?.message || '充电失败';
      return { code: 500, message };
    }
  }

  /**
   * 取消充电动态（从 like 中移除当前用户，与点赞共用 like / likeNums）
   */
  async unchargeDyn(params: ChargeDynParams): Promise<{ code: number; message?: string; data?: any }> {
    const { dynId, openId, dataEnv = 'test' } = params;

    try {
      const db = this.databaseService.getDatabase(dataEnv);

      const dynResult = await db.collection('dyn').doc(dynId).get();
      if (dynResult && typeof (dynResult as any).code !== 'undefined' && (dynResult as any).code !== 0) {
        const errMsg = (dynResult as any).message || '获取动态失败';
        console.error('[DynService] unchargeDyn get doc error:', dynResult);
        return { code: 500, message: errMsg };
      }
      const dyn = Array.isArray(dynResult.data) ? dynResult.data[0] : dynResult.data;

      if (!dyn) {
        return { code: 404, message: '动态不存在' };
      }

      const like = Array.isArray(dyn.like) ? [...dyn.like] : [];
      const likeNums = Math.max(0, (dyn.likeNums ?? 0));
      if (!like.includes(openId)) {
        return { code: 200, message: 'success', data: { isLiked: false, likeNums, chargeCount: likeNums } };
      }

      const newLike = like.filter((id: string) => id !== openId);
      const newNums = Math.max(0, likeNums - 1);

      const ok = await this.databaseService.updateById(
        'dyn',
        dynId,
        { like: newLike, likeNums: newNums },
        dataEnv,
      );

      if (!ok) {
        return { code: 500, message: '更新失败' };
      }

      return {
        code: 200,
        message: 'success',
        data: { isLiked: false, likeNums: newNums, chargeCount: newNums },
      };
    } catch (error: any) {
      console.error('[DynService] unchargeDyn error:', error);
      const message = error?.message || '取消充电失败';
      return { code: 500, message };
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
