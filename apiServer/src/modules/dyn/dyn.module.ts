/**
 * 动态模块
 */
import { Module } from '@nestjs/common';
import { DynService } from './dyn.service';
import { DatabaseModule } from '../database/database.module';
import { CloudbaseModule } from '../cloudbase/cloudbase.module';

@Module({
  imports: [DatabaseModule, CloudbaseModule],
  providers: [DynService],
  exports: [DynService],
})
export class DynModule {}
