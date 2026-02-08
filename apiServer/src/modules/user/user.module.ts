/**
 * 用户模块
 */
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { DatabaseModule } from '../database/database.module';
import { CloudbaseModule } from '../cloudbase/cloudbase.module';

@Module({
  imports: [DatabaseModule, CloudbaseModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
