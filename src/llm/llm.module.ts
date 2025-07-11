import { Module } from '@nestjs/common';

import { GeminiService } from './gemini.service';
import { LLMService } from './llm.service.interface';
import { CommonModule } from '../common/common.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule, CommonModule],
  providers: [
    GeminiService,
    {
      provide: LLMService,
      useClass: GeminiService,
    },
  ],
  exports: [LLMService],
})
export class LlmModule {}
