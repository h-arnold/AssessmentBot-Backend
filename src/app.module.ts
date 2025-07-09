import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule, CommonModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
