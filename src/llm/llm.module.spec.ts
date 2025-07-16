import { Test, TestingModule } from '@nestjs/testing';

import { LlmModule } from './llm.module';
import { LLMService } from './llm.service.interface';
import { JsonParserUtil } from '../common/json-parser.util';
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

/**
 * A mock implementation of a JSON parser utility for testing purposes.
 *
 * This mock object contains a `parse` method that simulates the behavior of
 * parsing a JSON string into a JavaScript object. The `parse` method is
 * implemented using Jest's `fn` to allow tracking calls and providing custom
 * behavior during tests.
 *
 * @property parse - A Jest mock function that takes a JSON string as input
 * and returns the parsed JavaScript object.
 */
const mockJsonParserUtil = {
  parse: jest.fn((jsonString: string) => {
    return JSON.parse(jsonString);
  }),
};

describe('LlmModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LlmModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(JsonParserUtil)
      .useValue(mockJsonParserUtil)
      .compile();
    expect(module).toBeDefined();
  });

  it('should provide the LLMService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LlmModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(JsonParserUtil)
      .useValue(mockJsonParserUtil)
      .compile();
    const configService = module.get(ConfigService);
    expect(configService).toBeDefined();
    const llmService = module.get(LLMService);
    expect(llmService).toBeDefined();
  });
});
