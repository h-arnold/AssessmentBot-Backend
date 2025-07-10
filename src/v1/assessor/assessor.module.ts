import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';

/**
 * NestJS module for the Assessor feature.
 * Provides the AssessorService and AssessorController.
 */
@Module({
  imports: [ConfigModule],
  controllers: [AssessorController],
  providers: [AssessorService],
  exports: [AssessorService],
})
export class AssessorModule {}
