/**
 * 数据库模块
 */
import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CloudbaseModule } from '../cloudbase/cloudbase.module';

@Global()
@Module({
  imports: [CloudbaseModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
