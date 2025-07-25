import * as fs from 'fs';
import * as path from 'path';

import { Test, TestingModule } from '@nestjs/testing';

import { ConfigModule } from './config.module';
import { ConfigService } from './config.service';

describe('ConfigModule', () => {
  let module: TestingModule;

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_KEYS = 'test-api-key';
    process.env.MAX_IMAGE_UPLOAD_SIZE_MB = '5';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
    process.env.LOG_LEVEL = 'debug';
  });

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.LOG_LEVEL = 'debug';
    module = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();
  });

  it('should be defined', () => {
    const configModule = module.get<ConfigModule>(ConfigModule);
    expect(configModule).toBeDefined();
  });

  it('should export ConfigService', () => {
    const configService = module.get<ConfigService>(ConfigService);
    expect(configService).toBeDefined();
  });

  it('should initialise successfully when .env file is missing but required env vars are set', async () => {
    // Temporarily remove .env file if it exists for this test
    const originalDotEnvPath = path.resolve(process.cwd(), '.env');
    let dotEnvExists = false;
    if (fs.existsSync(originalDotEnvPath)) {
      fs.renameSync(originalDotEnvPath, originalDotEnvPath + '.bak');
      dotEnvExists = true;
    }

    // Ensure required variables are set in process.env
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.APP_NAME = 'TestApp';
    process.env.APP_VERSION = '1.0.0';

    let testModule: TestingModule | undefined;
    let error: unknown;
    try {
      testModule = await Test.createTestingModule({
        imports: [ConfigModule],
      }).compile();
    } catch (e) {
      error = e;
    } finally {
      // Restore .env file if it existed
      if (dotEnvExists) {
        fs.renameSync(originalDotEnvPath + '.bak', originalDotEnvPath);
      }
    }

    expect(error).toBeUndefined();
    expect(testModule).toBeDefined();
    const configService =
      testModule && testModule.get<ConfigService>(ConfigService);
    expect(configService).toBeDefined();
    expect(configService?.get('NODE_ENV')).toBe('test');
    expect(configService?.get('PORT')).toBe(3000);
    expect(configService?.get('APP_NAME')).toBe('TestApp');
    expect(configService?.get('APP_VERSION')).toBe('1.0.0');
  });
});
