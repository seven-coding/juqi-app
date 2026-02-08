/**
 * 当前用户装饰器
 * 用于在 Controller 中获取当前用户信息
 */
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { SKIP_AUTH_KEY } from '../guards/auth.guard';

/**
 * 当前用户信息
 */
export interface CurrentUserInfo {
  /** 用户 openId */
  openId: string | null;
  /** 新 Token（如果需要刷新） */
  newToken?: string;
}

/**
 * 获取当前用户信息
 * @example
 * ```typescript
 * @Post('api')
 * @UseGuards(AuthGuard)
 * async handleRequest(@CurrentUser() user: CurrentUserInfo) {
 *   console.log(user.openId);
 *   if (user.newToken) {
 *     // 响应中需要返回新 Token
 *   }
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserInfo => {
    const request = ctx.switchToHttp().getRequest();
    return {
      openId: request.openId || null,
      newToken: request.newToken,
    };
  },
);

/**
 * 跳过 Token 验证装饰器
 * @example
 * ```typescript
 * @Post('public-api')
 * @SkipAuth()
 * async publicEndpoint() {
 *   // 不需要 Token 验证
 * }
 * ```
 */
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);
