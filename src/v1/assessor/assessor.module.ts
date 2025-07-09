import { Module } from '@nestjs/common';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';

@Module({
  controllers: [AssessorController],
  providers: [AssessorService],
  exports: [AssessorService],
})
export class AssessorModule {}
