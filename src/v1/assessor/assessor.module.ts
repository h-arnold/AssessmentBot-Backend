import { Module } from '@nestjs/common';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';
import { LlmModule } from '../../llm/llm.module';
import { PromptModule } from '../../prompt/prompt.module';

@Module({
  imports: [LlmModule, PromptModule],
  controllers: [AssessorController],
  providers: [AssessorService],
})
export class AssessorModule {}
