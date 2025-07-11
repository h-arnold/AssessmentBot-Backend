import { Test, TestingModule } from '@nestjs/testing';

import { LlmModule } from './llm.module';
import { LLMService } from './llm.service.interface';
import { ConfigModule } from '../config/config.module';

describe('LlmModule', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_KEYS = 'test-api-key';
    process.env.MAX_IMAGE_UPLOAD_SIZE_MB = '5';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
  });

  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, LlmModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should provide the LLMService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, LlmModule],
    }).compile();

    const llmService = module.get<LLMService>('LLMService');
    expect(llmService).toBeDefined();
  });
});
