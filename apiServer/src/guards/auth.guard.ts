/**
 * Token 验证 Guard
 * 在 Controller 级别验证用户 Token
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken, generateToken } from '../utils/token.util';

/** 不需要 Token 验证的接口列表 */
const NO_AUTH_OPERATIONS = new Set([
  'appLogin',
  'appRefreshToken',
]);

/** 元数据 key：跳过 Token 验证 */
export const SKIP_AUTH_KEY = 'skipAuth';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 检查是否通过装饰器跳过验证
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAuth) {
      return true;
    }

    // 获取 operation
    const operation = request.body?.operation;

    // 检查是否是不需要验证的接口
    if (operation && NO_AUTH_OPERATIONS.has(operation)) {
      // 不需要验证，但仍然尝试解析 token 以获取 openId（如果有的话）
      const token = this.extractToken(request);
      if (token) {
        const result = verifyToken(token);
        if (result.valid) {
          request.openId = result.openId;
        }
      }
      return true;
    }

    // 获取 Token
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 401,
        message: '未提供 Token',
        data: null,
      });
    }

    // 验证 Token
    const result = verifyToken(token);

    if (!result.valid) {
      throw new UnauthorizedException({
        code: 401,
        message: result.error || 'Token 无效',
        data: null,
      });
    }

    // 注入 openId 到 request
    request.openId = result.openId;

    // 如果需要刷新，生成新 Token 并注入到 request
    if (result.needRefresh && result.openId) {
      request.newToken = generateToken(result.openId);
    }

    return true;
  }

  /**
   * 从请求中提取 Token
   * 支持多种方式：body.token、Authorization header
   */
  private extractToken(request: any): string | null {
    // 优先从 body 中获取
    if (request.body?.token) {
      return request.body.token;
    }

    // 从 Authorization header 获取
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      // 支持 Bearer token 和直接传 token
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return authHeader;
    }

    return null;
  }
}
