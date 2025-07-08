
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import * as fs from 'fs';

describe('ConfigService', () => {
  let service: ConfigService;

  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
  });

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
    // Clean up the .env file
    if (fs.existsSync('.env')) {
      fs.unlinkSync('.env');
    }
  });

  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    expect(service).toBeDefined();
  });

  describe('Environment variable loading', () => {
    it('should load environment variables from process.env', async () => {
      process.env.TEST_VAR = 'test_value';
      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();
      service = module.get<ConfigService>(ConfigService);
      expect(service.get('TEST_VAR')).toBe('test_value');
    });

    it('should load variables from .env file', async () => {
      fs.writeFileSync('.env', 'TEST_VAR_DOTENV=test_value_dotenv');
      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();
      service = module.get<ConfigService>(ConfigService);
      expect(service.get('TEST_VAR_DOTENV')).toBe('test_value_dotenv');
    });

    it('should prioritize process.env over .env file', async () => {
      fs.writeFileSync('.env', 'PRIORITIZED_VAR=dotenv_value');
      process.env.PRIORITIZED_VAR = 'process_env_value';
      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();
      service = module.get<ConfigService>(ConfigService);
      expect(service.get('PRIORITIZED_VAR')).toBe('process_env_value');
    });
  });

  describe('Zod schema validation', () => {
    it('should fail when NODE_ENV is missing', () => {
        delete process.env.NODE_ENV;
        expect(() => new ConfigService()).toThrow();
    });

    it('should fail when PORT is missing', () => {
        delete process.env.PORT;
        expect(() => new ConfigService()).toThrow();
    });
  });
});
