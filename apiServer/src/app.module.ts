import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppModule as AppApiModule } from './modules/app/app.module';
import { CloudbaseModule } from './modules/cloudbase/cloudbase.module';
import { DatabaseModule } from './modules/database/database.module';
import { AllExceptionsFilter } from './filters/error.filter';
import { AuthGuard } from './guards/auth.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CloudbaseModule,
    DatabaseModule,
    AppApiModule,
  ],
  controllers: [],
  providers: [
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局认证守卫
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // 全局响应拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
