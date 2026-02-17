import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudbaseService } from '../cloudbase/cloudbase.service';
import { DynService } from '../dyn/dyn.service';
import { UserService } from '../user/user.service';
import { MessageService } from '../message/message.service';

/**
 * 固定走直连的 operation 清单（代码内写死，不按环境变量按接口切换）
 * 测试环境以 apiServer 直连为主，上述 7 个固定直连；其余走 appApiV201。
 */
export const DIRECT_DB_OPERATIONS: readonly string[] = [
  'appGetCurrentUserProfile',
  'appGetDynList',
  'appGetDynDetail',
  'appChargeDyn',
  'appGetUnreadCount',
  'appGetMessageList',
  'appGetChatList',
];

/**
 * 迁移配置（只读展示用）
 * 控制哪些接口使用直连数据库，哪些继续使用云函数
 * true = 使用直连数据库
 * false = 使用云函数
 */
export interface MigrationConfig {
  /** 获取当前用户 Profile */
  appGetCurrentUserProfile: boolean;
  /** 获取动态列表 */
  appGetDynList: boolean;
  /** 获取动态详情（与列表同源，避免列表直连时详情走云函数导致 404） */
  appGetDynDetail: boolean;
  /** 充电动态（与列表同源，避免列表直连时充电走云函数导致 document does not exist） */
  appChargeDyn: boolean;
  /** 获取未读消息数 */
  appGetUnreadCount: boolean;
  /** 获取消息列表 */
  appGetMessageList: boolean;
  /** 获取私信列表 */
  appGetChatList: boolean;
}

/** 正式环境只读时允许的操作（仅查看类，不含增删改） */
const PROD_READONLY_OPERATIONS = new Set([
  'appLogin',
  'appRefreshToken',
  'appSubmitLanguageVerify',
  'appGetVerifyStatus',
  // 兼容旧接口名（不以 app 开头但实际是只读操作）
  'getMessagesNew',
  'setMessage', // 实际上是标记已读，属于只读类操作
]);

function isReadOnlyOperation(operation: string): boolean {
  if (!operation || typeof operation !== 'string') return false;
  if (PROD_READONLY_OPERATIONS.has(operation)) return true;
  if (operation.startsWith('appGet') || operation.startsWith('appSearch')) return true;
  return false;
}

@Injectable()
export class AppService {
  /** 全局回滚开关 - 紧急情况下关闭所有直连，使用云函数 */
  private useCloudFunctionFallback: boolean;

  constructor(
    private readonly cloudbaseService: CloudbaseService,
    private readonly configService: ConfigService,
    private readonly dynService: DynService,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
  ) {
    this.useCloudFunctionFallback = this.configService.get('USE_CLOUD_FUNCTION_FALLBACK') === 'true';
    console.log('[AppService] 直连清单: DIRECT_DB_OPERATIONS（固定 7 个），不按 MIGRATION_* 切换');
    console.log('[AppService] 回滚开关:', this.useCloudFunctionFallback);
  }

  /**
   * @deprecated 直连由 DIRECT_DB_OPERATIONS 固定，不再支持按接口切换；保留为空实现避免调用方报错
   */
  updateMigrationConfig(_key: keyof MigrationConfig, _value: boolean): void {
    // no-op
  }

  /**
   * 设置全局回滚开关（仅用于故障应急）
   */
  setFallbackMode(enabled: boolean): void {
    this.useCloudFunctionFallback = enabled;
    console.log(`[AppService] 设置回滚模式: ${enabled}`);
  }

  /**
   * 获取当前迁移配置（只读展示，由 DIRECT_DB_OPERATIONS + 回滚开关推导）
   */
  getMigrationConfig(): MigrationConfig {
    const useDirect = !this.useCloudFunctionFallback;
    return {
      appGetCurrentUserProfile: useDirect && DIRECT_DB_OPERATIONS.includes('appGetCurrentUserProfile'),
      appGetDynList: useDirect && DIRECT_DB_OPERATIONS.includes('appGetDynList'),
      appGetDynDetail: useDirect && DIRECT_DB_OPERATIONS.includes('appGetDynDetail'),
      appChargeDyn: useDirect && DIRECT_DB_OPERATIONS.includes('appChargeDyn'),
      appGetUnreadCount: useDirect && DIRECT_DB_OPERATIONS.includes('appGetUnreadCount'),
      appGetMessageList: useDirect && DIRECT_DB_OPERATIONS.includes('appGetMessageList'),
      appGetChatList: useDirect && DIRECT_DB_OPERATIONS.includes('appGetChatList'),
    };
  }

  /**
   * 检查接口是否使用直连
   * 仅由 DIRECT_DB_OPERATIONS + USE_CLOUD_FUNCTION_FALLBACK 决定，不再读取 MIGRATION_* 环境变量
   */
  shouldUseDirectDB(operation: string): boolean {
    if (this.useCloudFunctionFallback) {
      return false;
    }
    return DIRECT_DB_OPERATIONS.includes(operation);
  }

  /** 脱敏 openId，仅用于日志 */
  private static maskOpenId(openId: string | null): string {
    if (openId == null || typeof openId !== 'string') return 'nil';
    if (openId.length <= 4) return '****';
    return '****' + openId.slice(-4);
  }

  /**
   * 处理 API 请求（混合路由）
   * 根据迁移配置决定使用直连数据库还是云函数
   */
  async handleApiRequest(
    operation: string,
    data: any,
    openId: string | null,
    dataEnv: string = 'test',
    token?: string,  // 原始 token，用于传递给云函数
  ): Promise<any> {
    const startTime = Date.now();

    // 消息相关接口：打印传参便于排查 ID/环境 问题
    if (operation === 'getMessagesNew' || operation === 'appGetMessageList') {
      const d = data || {};
      console.log(`[AppService] 消息接口传参 operation=${operation}, openId(尾4)=${AppService.maskOpenId(openId)}, openId空=${!openId || openId === ''}, dataEnv=${dataEnv}, page=${d.page ?? 'nil'}, limit=${d.limit ?? 'nil'}, type=${d.type !== undefined ? d.type : 'nil'}, from=${d.from ?? 'nil'}, aitType=${d.aitType !== undefined ? d.aitType : 'nil'}`);
    }

    // 检查是否使用直连
    if (this.shouldUseDirectDB(operation)) {
      console.log(`[AppService] 直连数据库 - operation: ${operation}, dataEnv: ${dataEnv}`);
      try {
        const result = await this.handleDirectDBRequest(operation, data, openId, dataEnv);
        const duration = Date.now() - startTime;
        console.log(`[AppService] 直连成功 - operation: ${operation}, duration: ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[AppService] 直连失败，回退到云函数 - operation: ${operation}, error: ${error.message}, duration: ${duration}ms`);
        // 直连失败时自动回退到云函数
        return this.callAppApiCloudFunction(operation, data, token, dataEnv);
      }
    }

    // 使用云函数
    if (operation === 'appGetDynList') {
      console.log(`[AppService] 排查 动态列表走云函数 - dataEnv: ${dataEnv}`);
    }
    return this.callAppApiCloudFunction(operation, data, token, dataEnv);
  }

  /**
   * 处理直连数据库请求
   */
  private async handleDirectDBRequest(
    operation: string,
    data: any,
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    switch (operation) {
      case 'appGetCurrentUserProfile':
        return this.handleGetCurrentUserProfile(openId, dataEnv);

      case 'appGetDynList':
        return this.handleGetDynList(data, openId, dataEnv);

      case 'appGetDynDetail':
        return this.handleGetDynDetail(data, openId, dataEnv);

      case 'appChargeDyn':
        return this.handleChargeDyn(data, openId, dataEnv);

      case 'appGetUnreadCount':
        return this.handleGetUnreadCount(openId, dataEnv);

      case 'appGetMessageList':
        return this.handleGetMessageList(data, openId, dataEnv);

      case 'appGetChatList':
        return this.handleGetChatList(data, openId, dataEnv);

      default:
        throw new Error(`未实现的直连操作: ${operation}`);
    }
  }

  /**
   * 处理获取当前用户 Profile
   */
  private async handleGetCurrentUserProfile(
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    if (!openId) {
      return { code: 401, message: '未登录' };
    }

    const profile = await this.userService.getCurrentUserProfile({
      openId,
      dataEnv,
    });

    if (!profile) {
      return { code: 404, message: '用户不存在' };
    }

    return { code: 200, message: 'success', data: profile };
  }

  /**
   * 处理获取动态列表
   */
  private async handleGetDynList(
    data: any,
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    const { type: rawType = 2, pageSize: dataPageSize, offset = 0, limit, publicTime } = data || {};
    // 与 appApiV201 一致：客户端传字符串 all/follow/hot，映射为数字 2/6/10
    const typeMap: Record<string, number> = {
      all: 2,    // 最新
      follow: 6, // 关注
      hot: 10,   // 热榜
    };
    const type = typeof rawType === 'string' ? (typeMap[rawType] ?? 2) : Number(rawType);
    const pageSize = limit ?? dataPageSize ?? 20;
    console.log(
      `[AppService] handleGetDynList 直连 - dataEnv: ${dataEnv}, type: ${type}(raw: ${rawType}), pageSize: ${pageSize}, offset: ${offset}, publicTime: ${publicTime ?? 'nil'}`,
    );

    const result = await this.dynService.getDynList({
      type,
      pageSize,
      offset,
      dataEnv,
      openId: openId || undefined,
      publicTime: publicTime ?? undefined,
    });

    return { code: 200, message: 'success', data: result };
  }

  /**
   * 处理获取动态详情（与列表同库，避免 404）
   */
  private async handleGetDynDetail(
    data: any,
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    const id = data?.id;
    if (!id) {
      return { code: 400, message: '缺少动态ID' };
    }
    console.log(
      `[AppService] handleGetDynDetail 直连 - id: ${id}, dataEnv: ${dataEnv}`,
    );
    const dyn = await this.dynService.getDynDetail({
      dynId: id,
      dataEnv,
      openId: openId || undefined,
    });
    if (!dyn) {
      return { code: 404, message: '动态不存在' };
    }
    return { code: 200, message: 'success', data: dyn };
  }

  /**
   * 处理充电动态（直连，与列表/详情同库）
   */
  private async handleChargeDyn(
    data: any,
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    const id = data?.id;
    if (!id) {
      return { code: 400, message: '缺少动态ID', data: null };
    }
    if (!openId) {
      return { code: 401, message: '未登录', data: null };
    }
    console.log(`[AppService] handleChargeDyn 直连 - id: ${id}, dataEnv: ${dataEnv}`);
    return this.dynService.chargeDyn({ dynId: id, openId, dataEnv });
  }

  /**
   * 处理获取未读消息数
   */
  private async handleGetUnreadCount(
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    if (!openId) {
      return { code: 401, message: '未登录' };
    }

    const count = await this.messageService.getUnreadCount({
      openId,
      dataEnv,
    });

    return { code: 200, message: 'success', data: { notReadCount: count } };
  }

  /**
   * 处理获取消息列表
   */
  private async handleGetMessageList(
    data: any,
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    if (!openId) {
      return { code: 401, message: '未登录' };
    }

    const { type, pageSize = 20, offset = 0 } = data || {};

    const result = await this.messageService.getMessageList({
      openId,
      type,
      pageSize,
      offset,
      dataEnv,
    });

    return { code: 200, message: 'success', data: result };
  }

  /**
   * 处理获取私信列表
   */
  private async handleGetChatList(
    data: any,
    openId: string | null,
    dataEnv: string,
  ): Promise<any> {
    if (!openId) {
      return { code: 401, message: '未登录' };
    }

    const { pageSize = 20, offset = 0 } = data || {};

    const result = await this.messageService.getChatList({
      openId,
      pageSize,
      offset,
      dataEnv,
    });

    return { code: 200, message: 'success', data: result };
  }

  /**
   * 调用appApi云函数（保留原有逻辑作为后备）
   * @param operation 操作名称
   * @param data 请求数据
   * @param token 用户token（可选）
   * @param dataEnv 数据环境：'test' | 'prod'（可选，默认 'test'）
   * @returns 云函数返回结果
   */
  async callAppApiCloudFunction(
    operation: string,
    data?: any,
    token?: string,
    dataEnv?: string,
  ) {
    const startTime = Date.now();
    const effectiveDataEnv = dataEnv || 'test';
    
    try {
      // 正式环境只读时，仅允许只读操作，禁止增删改
      // 注意：只有当请求的是正式环境数据时才进行此检查
      if (effectiveDataEnv === 'prod' && this.cloudbaseService.isProdReadOnly && !isReadOnlyOperation(operation)) {
        console.warn(`[CloudFunction] Blocked - 正式环境只读，禁止操作: ${operation}`);
      return {
        code: 403,
        message: '正式环境仅支持查看，不支持增删改。请使用测试环境进行写操作。',
        data: null,
      };
      }

      // 第一期：统一调用 appApiV201（仅 App 走 v201，小程序仍用旧函数）
      // dataEnv 仅作为参数传给云函数，由云函数内部切换数据库环境
      const cloudbase = this.cloudbaseService.getCloudbase('test');
      const appApiName = 'appApiV201';

      const dataEnvEffective = dataEnv || 'test';
      console.log(`[CloudFunction] Calling - name: ${appApiName}, operation: ${operation}, source: v2, hasToken: ${!!token}, dataEnv: ${dataEnvEffective}`);
      if (operation === 'getMessagesNew' || operation === 'appGetMessageList') {
        const d = data || {};
        console.log(`[CloudFunction] 消息接口转发 data(传云函数): page=${d.page ?? 'nil'}, limit=${d.limit ?? 'nil'}, type=${d.type !== undefined ? d.type : 'nil'}, from=${d.from ?? 'nil'}, aitType=${d.aitType !== undefined ? d.aitType : 'nil'}`);
      }

      // 调用云函数，自动传递 source='v2' 参数和 dataEnv
      const result = await cloudbase.callFunction({
        name: appApiName,
        data: {
          operation,
          data: data || {},
          token: token || '',
          source: 'v2', // 自动添加source参数标识App请求
          dataEnv: dataEnv || 'test', // 数据环境，默认 test
        },
      });

      const duration = Date.now() - startTime;

      // 归一化云函数返回：客户端只认根级 { code, message, data }，不能带 result 包装
      let payload: any = result != null && result.result !== undefined ? result.result : result;
      // result 有时为 JSON 字符串
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      }
      // 兼容双层 result（如 { result: { result: { code, data, message } } }）
      if (payload && typeof payload === 'object' && payload.result !== undefined && typeof payload.code !== 'number') {
        payload = payload.result;
      }
      if (payload && typeof payload === 'object' && typeof payload.code === 'number') {
        const responseCode = payload.code;
        console.log(`[CloudFunction] Success - operation: ${operation}, code: ${responseCode}, duration: ${duration}ms`);
        return { code: payload.code, message: payload.message ?? '成功', data: payload.data ?? null };
      }

      console.warn(`[CloudFunction] 云函数返回结构异常 - operation: ${operation}, duration: ${duration}ms, result keys: ${result ? Object.keys(result).join(',') : 'null'}`);
      return {
        code: 500,
        message: '云函数未返回有效数据',
        data: null,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CloudFunction] Error - operation: ${operation}, error: ${error.message || 'Unknown error'}, duration: ${duration}ms`, error);
      return {
        code: 500,
        message: error.message || '服务器错误',
        data: null,
      };
    }
  }
}
