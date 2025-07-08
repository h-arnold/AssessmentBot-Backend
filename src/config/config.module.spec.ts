
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from './config.module';
import { ConfigService } from './config.service';

describe('ConfigModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
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
});
