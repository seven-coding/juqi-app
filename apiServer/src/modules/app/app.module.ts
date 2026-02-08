import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CloudbaseModule } from '../cloudbase/cloudbase.module';
import { DatabaseModule } from '../database/database.module';
import { DynModule } from '../dyn/dyn.module';
import { UserModule } from '../user/user.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    CloudbaseModule,
    DatabaseModule,
    DynModule,
    UserModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
