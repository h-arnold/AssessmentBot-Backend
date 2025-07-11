import { Test, TestingModule } from '@nestjs/testing';

import { LlmModule } from './llm.module';
import { LLMService } from './llm.service.interface';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';

const defaults = {
  GEMINI_API_KEY: 'test-key',
  NODE_ENV: 'test',
  PORT: '3000',
  API_KEYS: 'test-api-key',
  MAX_IMAGE_UPLOAD_SIZE_MB: '5',
  ALLOWED_IMAGE_MIME_TYPES: 'image/png,image/jpeg',
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    return defaults[key as keyof typeof defaults];
  }),
};

describe('LlmModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LlmModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();
    expect(module).toBeDefined();
  });

  it('should provide the LLMService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LlmModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();
    const configService = module.get(ConfigService);
    expect(configService).toBeDefined();
    const llmService = module.get(LLMService);
    expect(llmService).toBeDefined();
  });
});
