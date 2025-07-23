import { Module } from '@nestjs/common';

import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
