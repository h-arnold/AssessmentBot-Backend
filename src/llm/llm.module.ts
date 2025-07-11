import { Module } from '@nestjs/common';

import { GeminiService } from './gemini.service';
import { LLMService } from './llm.service.interface';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLMService,
      useClass: GeminiService,
    },
  ],
  exports: [LLMService],
})
export class LlmModule {}
