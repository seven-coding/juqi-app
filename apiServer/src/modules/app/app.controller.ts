import { Controller, Post, Body, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { CurrentUser, CurrentUserInfo, SkipAuth } from '../../decorators/current-user.decorator';

interface AppApiRequest {
  operation: string;
  data?: any;
  token?: string;
  dataEnv?: string; // 数据环境：'test' | 'prod'
}

@Controller('app/v2')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 统一 API 入口（混合路由）
   * 根据迁移配置自动选择直连数据库或云函数
   * 使用 200 以便客户端统一按 JSON body 解析（避免 201 导致部分网关/客户端异常）
   */
  @Post('api')
  @HttpCode(HttpStatus.OK)
  async api(
    @Body() body: AppApiRequest,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    const startTime = Date.now();
    const { operation, data, token, dataEnv = 'test' } = body;

    console.log(`[API] Request received - operation: ${operation}, hasToken: ${!!token}, hasData: ${!!data}, dataEnv: ${dataEnv}, openId: ${user.openId || 'none'}`);

    if (!operation) {
      console.log(`[API] Parameter validation failed - missing operation`);
      return {
        code: 400,
        message: '缺少operation参数',
      };
    }

    // 使用混合路由处理请求
    const result = await this.appService.handleApiRequest(
      operation,
      data,
      user.openId,
      dataEnv,
      token,  // 传递原始 token 给云函数
    );

    const duration = Date.now() - startTime;
    console.log(`[API] Response - operation: ${operation}, code: ${result?.code || 'unknown'}, duration: ${duration}ms`);

    // 如果有新 Token，附加到响应
    if (user.newToken) {
      result.newToken = user.newToken;
    }

    return result;
  }

  /**
   * 获取迁移配置状态
   * 用于调试和监控
   */
  @Get('migration/config')
  @SkipAuth()
  getMigrationConfig() {
    return {
      code: 200,
      message: 'success',
      data: this.appService.getMigrationConfig(),
    };
  }

  /**
   * 更新迁移配置（仅开发环境）
   * POST /app/v2/migration/config
   * Body: { key: 'appGetCurrentUserProfile', value: true }
   */
  @Post('migration/config')
  @SkipAuth()
  updateMigrationConfig(
    @Body() body: { key: string; value: boolean },
  ) {
    const { key, value } = body;

    if (!key) {
      return { code: 400, message: '缺少 key 参数' };
    }

    const validKeys = [
      'appGetCurrentUserProfile',
      'appGetDynList',
      'appGetUnreadCount',
      'appGetMessageList',
      'appGetChatList',
    ];

    if (!validKeys.includes(key)) {
      return { code: 400, message: `无效的 key: ${key}` };
    }

    this.appService.updateMigrationConfig(key as any, !!value);

    return {
      code: 200,
      message: 'success',
      data: this.appService.getMigrationConfig(),
    };
  }

  /**
   * 设置全局回滚开关
   * POST /app/v2/migration/fallback
   * Body: { enabled: true }
   */
  @Post('migration/fallback')
  @SkipAuth()
  setFallbackMode(
    @Body() body: { enabled: boolean },
  ) {
    this.appService.setFallbackMode(!!body.enabled);

    return {
      code: 200,
      message: body.enabled ? '已启用全局回滚模式' : '已关闭全局回滚模式',
    };
  }

  /**
   * 健康检查
   */
  @Get('health')
  @SkipAuth()
  health() {
    return {
      code: 200,
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
