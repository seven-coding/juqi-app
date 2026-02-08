import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const path = httpAdapter.getRequestUrl(request);
    
    let message = '请求失败，请稍后再试';
    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let exceptionType = 'Unknown';

    if (exception instanceof HttpException) {
      exceptionType = 'HttpException';
      const exceptionRes = JSON.parse(JSON.stringify(exception.getResponse()));
      message = exceptionRes?.message || exceptionRes || message;
      code = exception.getStatus();

      if (code === 429) {
        message = '请求过于频繁，请稍后再试';
      }
    } else if (exception instanceof Error) {
      exceptionType = exception.constructor.name;
    }

    console.error(`[ErrorFilter] Exception caught - type: ${exceptionType}, code: ${code}, path: ${path}, message: ${message}`);
    if (exception instanceof Error) {
      console.error(`[ErrorFilter] Stack trace:`, exception.stack);
    }

    const responseBody = {
      code,
      message,
      timestamp: new Date().toISOString(),
      path,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, code);
  }
}
