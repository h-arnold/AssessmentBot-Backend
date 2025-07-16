import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssessorController } from './assessor.controller';
import { AssessorModule } from './assessor.module';
import { AssessorService } from './assessor.service';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string | number> = {
      GEMINI_API_KEY: 'test-key',
      NODE_ENV: 'test',
      PORT: 3000,
      API_KEYS: 'test-api-key',
      MAX_IMAGE_UPLOAD_SIZE_MB: 5,
      ALLOWED_IMAGE_MIME_TYPES: 'image/png,image/jpeg',
    };
    return config[key];
  }),
};

describe('AssessorModule', () => {
  let module: TestingModule;

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_KEYS = 'test-api-key';
    process.env.MAX_IMAGE_UPLOAD_SIZE_MB = '5';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AssessorModule],
      providers: [Logger],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AssessorController', () => {
    const controller = module.get<AssessorController>(AssessorController);
    expect(controller).toBeDefined();
  });

  it('should provide AssessorService', () => {
    const service = module.get<AssessorService>(AssessorService);
    expect(service).toBeDefined();
  });
});
