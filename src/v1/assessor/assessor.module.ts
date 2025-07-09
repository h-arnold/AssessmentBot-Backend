import { Module } from '@nestjs/common';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';

/**
 * NestJS module for the Assessor feature.
 * Provides the AssessorService and AssessorController.
 */
@Module({
  controllers: [AssessorController],
  providers: [AssessorService],
  exports: [AssessorService],
})
export class AssessorModule {}
