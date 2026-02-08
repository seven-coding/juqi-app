import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudbaseService } from '../cloudbase/cloudbase.service';
import { DynService } from '../dyn/dyn.service';
import { UserService } from '../user/user.service';
import { MessageService } from '../message/message.service';

/**
 * 迁移配置
 * 控制哪些接口使用直连数据库，哪些继续使用云函数
 * true = 使用直连数据库
 * false = 使用云函数
 */
export interface MigrationConfig {
  /** 获取当前用户 Profile */
  appGetCurrentUserProfile: boolean;
  /** 获取动态列表 */
  appGetDynList: boolean;
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
  /** 迁移配置 - 控制接口路由 */
  private migrationConfig: MigrationConfig;

  /** 全局回滚开关 - 紧急情况下关闭所有直连，使用云函数 */
  private useCloudFunctionFallback: boolean;

  constructor(
    private readonly cloudbaseService: CloudbaseService,
    private readonly configService: ConfigService,
    private readonly dynService: DynService,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
  ) {
    // 初始化迁移配置
    // 可通过环境变量 MIGRATION_xxx 控制
    this.migrationConfig = {
      appGetCurrentUserProfile: this.configService.get('MIGRATION_USER_PROFILE') === 'true',
      appGetDynList: this.configService.get('MIGRATION_DYN_LIST') === 'true',
      appGetUnreadCount: this.configService.get('MIGRATION_UNREAD_COUNT') === 'true',
      appGetMessageList: this.configService.get('MIGRATION_MESSAGE_LIST') === 'true',
      appGetChatList: this.configService.get('MIGRATION_CHAT_LIST') === 'true',
    };

    // 全局回滚开关
    this.useCloudFunctionFallback = this.configService.get('USE_CLOUD_FUNCTION_FALLBACK') === 'true';

    console.log('[AppService] 迁移配置:', this.migrationConfig);
    console.log('[AppService] 回滚开关:', this.useCloudFunctionFallback);
  }

  /**
   * 运行时更新迁移配置
   * 用于动态启用/禁用直连功能
   */
  updateMigrationConfig(key: keyof MigrationConfig, value: boolean): void {
    this.migrationConfig[key] = value;
    console.log(`[AppService] 更新迁移配置: ${key} = ${value}`);
  }

  /**
   * 设置全局回滚开关
   */
  setFallbackMode(enabled: boolean): void {
    this.useCloudFunctionFallback = enabled;
    console.log(`[AppService] 设置回滚模式: ${enabled}`);
  }

  /**
   * 获取当前迁移配置
   */
  getMigrationConfig(): MigrationConfig {
    return { ...this.migrationConfig };
  }

  /**
   * 检查接口是否使用直连
   */
  shouldUseDirectDB(operation: string): boolean {
    // 如果开启了全局回滚，则所有接口都使用云函数
    if (this.useCloudFunctionFallback) {
      return false;
    }
    return this.migrationConfig[operation as keyof MigrationConfig] || false;
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
    const { type = 2, pageSize = 10, offset = 0 } = data || {};

    const result = await this.dynService.getDynList({
      type,
      pageSize,
      offset,
      dataEnv,
      openId: openId || undefined,
    });

    return { code: 200, message: 'success', data: result };
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

      // 始终使用测试环境实例调用云函数（appApi v2 只部署在测试环境）
      // dataEnv 仅作为参数传给云函数，由云函数内部切换数据库环境
      const cloudbase = this.cloudbaseService.getCloudbase('test');

      console.log(`[CloudFunction] Calling - name: appApi, operation: ${operation}, source: v2, hasToken: ${!!token}, dataEnv: ${dataEnv || 'test'}`);

      // 调用云函数，自动传递 source='v2' 参数和 dataEnv
      const result = await cloudbase.callFunction({
        name: 'appApi',
        data: {
          operation,
          data: data || {},
          token: token || '',
          source: 'v2', // 自动添加source参数标识App请求
          dataEnv: dataEnv || 'test', // 数据环境，默认 test
        },
      });

      const duration = Date.now() - startTime;

      // 处理云函数返回结果
      if (result && result.result) {
        const responseCode = result.result.code || 'unknown';
        console.log(`[CloudFunction] Success - operation: ${operation}, code: ${responseCode}, duration: ${duration}ms`);
        return result.result;
      }

      console.log(`[CloudFunction] Success - operation: ${operation}, duration: ${duration}ms, result: ${JSON.stringify(result)}`);
      return result;
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
