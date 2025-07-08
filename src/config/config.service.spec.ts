
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Environment variable loading', () => {
    it('should load environment variables from process.env', () => {
      process.env.TEST_VAR = 'test_value';
      expect(service.get('TEST_VAR')).toBe('test_value');
    });

    it('should load variables from .env file', () => {
      // This test will be implemented later
    });

    it('should prioritize process.env over .env file', () => {
      // This test will be implemented later
    });
  });
});
