/**
 * 统一响应拦截器
 * 确保所有接口响应格式一致
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应格式
 */
export interface ApiResponse<T> {
  /** 状态码：200 成功，其他失败 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 新 Token（如果需要刷新） */
  newToken?: string;
}

/**
 * 成功响应的辅助函数
 */
export function success<T>(data: T, message: string = 'success'): ApiResponse<T> {
  return {
    code: 200,
    message,
    data,
  };
}

/**
 * 失败响应的辅助函数
 */
export function fail<T = null>(message: string, code: number = 400, data: T = null as any): ApiResponse<T> {
  return {
    code,
    message,
    data,
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // 如果已经是标准格式，直接返回
        if (this.isApiResponse(data)) {
          // 注入新 Token（如果有）
          if (request.newToken) {
            data.newToken = request.newToken;
          }
          return data;
        }

        // 封装成标准格式
        const response: ApiResponse<T> = {
          code: 200,
          message: 'success',
          data: data,
        };

        // 注入新 Token（如果有）
        if (request.newToken) {
          response.newToken = request.newToken;
        }

        return response;
      }),
    );
  }

  /**
   * 检查是否已经是标准 ApiResponse 格式
   */
  private isApiResponse(data: any): data is ApiResponse<T> {
    return (
      data !== null &&
      typeof data === 'object' &&
      typeof data.code === 'number' &&
      typeof data.message === 'string' &&
      'data' in data
    );
  }
}
