/**
 * 消息模块
 */
import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { DatabaseModule } from '../database/database.module';
import { CloudbaseModule } from '../cloudbase/cloudbase.module';

@Module({
  imports: [DatabaseModule, CloudbaseModule],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
