import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';

import { AssessorController } from './assessor.controller';
import { AssessorModule } from './assessor.module';
import { AssessorService } from './assessor.service';
import { ConfigModule, ConfigService } from '../../config';

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string | number> = {
      GEMINI_API_KEY: 'test-key',
      NODE_ENV: 'test',
      PORT: 3000,
      API_KEYS: 'test-api-key',
      MAX_IMAGE_UPLOAD_SIZE_MB: 5,
      ALLOWED_IMAGE_MIME_TYPES: 'image/png,image/jpeg',
      LOG_LEVEL: 'debug',
      ASSESSOR_CACHE_HASH_SECRET: 'test-cache-secret',
      ASSESSOR_CACHE_TTL_MINUTES: 1440,
      ASSESSOR_CACHE_MAX_SIZE_MIB: 384,
    };
    return config[key];
  }),
};

describe('AssessorModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AssessorModule,
        LoggerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            pinoHttp: {
              level: configService.get('LOG_LEVEL'),
            },
          }),
        }),
      ],
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
