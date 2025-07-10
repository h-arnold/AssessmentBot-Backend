import * as fs from 'fs';
import * as path from 'path';

import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import { z } from 'zod';

import { ConfigService } from './config.service';

// Mock the fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Keep actual implementations for other fs functions if needed
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(), // Mock writeFileSync as well
  unlinkSync: jest.fn(), // Mock unlinkSync as well
}));

describe('ConfigService', () => {
  let service: ConfigService;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';

    delete process.env.APP_VERSION; // Ensure APP_VERSION is clean for tests that expect it to be undefined

    // Clear all fs mocks before each test
    (fs.existsSync as jest.Mock).mockClear();
    (fs.readFileSync as jest.Mock).mockClear();
    (fs.writeFileSync as jest.Mock).mockClear();
    (fs.unlinkSync as jest.Mock).mockClear();

    // Default mock for existsSync: .env file does not exist by default
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
    // Restore all mocks
    jest.restoreAllMocks();
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
      process.env.APP_NAME = 'TestAppNameFromEnv';
      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();
      service = module.get<ConfigService>(ConfigService);
      expect(service.get('APP_NAME')).toBe('TestAppNameFromEnv');
    });

    it('should load variables from .env file', async () => {
      // Mock .env file existence and content
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        return filePath.includes('.env');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('.env')) {
          return 'APP_NAME=TestAppNameFromDotEnv';
        }
        return ''; // Default for other files
      });

      // Ensure process.env does not have APP_NAME to verify .env loading
      delete process.env.APP_NAME;

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();
      service = module.get<ConfigService>(ConfigService);
      expect(service.get('APP_NAME')).toBe('TestAppNameFromDotEnv');
    });

    it('should prioritize process.env over .env file', async () => {
      // Mock .env file existence and content
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        return filePath.includes('.env');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('.env')) {
          return 'APP_VERSION=dotenv_version';
        }
        return ''; // Default for other files
      });
      process.env.APP_VERSION = 'process_env_version';
      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();
      service = module.get<ConfigService>(ConfigService);
      expect(service.get('APP_VERSION')).toBe('process_env_version');
    });
  });

  describe('Zod schema validation', () => {
    it('should fail when NODE_ENV is missing', () => {
      delete process.env.NODE_ENV;
      expect(() => new ConfigService()).toThrow();
    });

    it('should pass with valid NODE_ENV values', () => {
      const validEnvs = ['development', 'production', 'test'];
      validEnvs.forEach((env) => {
        process.env.NODE_ENV = env;
        expect(() => new ConfigService()).not.toThrow();
      });
    });

    it('should fail with invalid NODE_ENV values', () => {
      const invalidEnvs = ['invalid', '', null, undefined];
      invalidEnvs.forEach((env) => {
        process.env.NODE_ENV = env === null ? undefined : env;
        expect(() => new ConfigService()).toThrow();
      });
    });

    it('should be validated as a number', () => {
      process.env.PORT = 'not_a_number';
      expect(() => new ConfigService()).toThrow();
    });

    it('should be within valid range', () => {
      process.env.PORT = '0';
      expect(() => new ConfigService()).toThrow();
      process.env.PORT = '65536';
      expect(() => new ConfigService()).toThrow();
    });
  });

  describe('API Key validation', () => {
    it('should fail when API_KEYS is not a string', () => {
      process.env.API_KEYS = 12345 as unknown as string; // Force invalid type
      expect(() => new ConfigService()).toThrow();
    });

    it('should fail when API_KEYS contains malformed keys', () => {
      process.env.API_KEYS = 'key1,key2_with_invalid_chars-@,key3';
      expect(() => new ConfigService()).toThrow(
        'Invalid environment configuration.',
      );
    });

    it('should correctly parse a single API key', () => {
      const apiKey = 'a_single_valid_key';
      process.env.API_KEYS = apiKey;
      const configService = new ConfigService();
      expect(configService.get('API_KEYS')).toEqual([apiKey]);
    });

    it('should correctly parse multiple comma-separated API keys', () => {
      const apiKeys = 'key1,key2,key3';
      process.env.API_KEYS = apiKeys;
      const configService = new ConfigService();
      expect(configService.get('API_KEYS')).toEqual(['key1', 'key2', 'key3']);
    });

    it('should handle whitespace when parsing multiple keys', () => {
      const apiKeys = '  key1  ,  key2  ,key3';
      process.env.API_KEYS = apiKeys;
      const configService = new ConfigService();
      expect(configService.get('API_KEYS')).toEqual(['key1', 'key2', 'key3']);
    });

    it('should fail gracefully if API_KEYS is missing', () => {
      delete process.env.API_KEYS;
      // Assuming API_KEYS is optional, this shouldn't throw.
      // If it becomes required, this test should change to expect a throw.
      const configService = new ConfigService();
      expect(configService.get('API_KEYS')).toBeUndefined();
    });
  });

  describe('Schema defaults and optional values', () => {
    it('APP_NAME should return default value when not set', () => {
      delete process.env.APP_NAME;
      const configService = new ConfigService();
      expect(configService.get('APP_NAME')).toBe('AssessmentBot-Backend');
    });

    it('APP_VERSION should be optional and return undefined', () => {
      delete process.env.APP_VERSION;
      const configService = new ConfigService();
      expect(configService.get('APP_VERSION')).toBeUndefined();
    });
  });

  describe('Service-level value types', () => {
    it('ConfigService should return PORT as a number', () => {
      process.env.PORT = '3001';
      const configService = new ConfigService();
      expect(typeof configService.get('PORT')).toBe('number');
      expect(configService.get('PORT')).toBe(3001);
    });
  });

  describe('.env.example file validation', () => {
    const expectedRequiredVars = ['NODE_ENV', 'PORT', 'APP_NAME'];

    beforeEach(() => {
      // Ensure .env.example exists for these tests
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        return filePath.includes('.env.example');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('.env.example')) {
          return `
NODE_ENV=development
PORT=3000
APP_NAME=AssessmentBot-Backend
APP_VERSION=1.0.0
DATABASE_URL=your_database_url_here
API_KEY=your_api_key_here
# This is a comment
SOME_OTHER_VAR=value
          `;
        }
        return '';
      });
    });

    it('.env.example should contain all required variables', () => {
      const fileContent = (fs.readFileSync as jest.Mock)(
        '.env.example',
        'utf-8',
      );
      const lines = fileContent
        .split('\n')
        .filter((line: string) => line.trim() !== '' && !line.startsWith('#'));
      const variablesInFile = lines.map((line: string) => line.split('=')[0]);

      expectedRequiredVars.forEach((variable) => {
        expect(variablesInFile).toContain(variable);
      });
    });

    it('.env.example should use placeholder values', () => {
      const fileContent = (fs.readFileSync as jest.Mock)(
        '.env.example',
        'utf-8',
      );
      expect(fileContent).toContain('your_database_url_here');
      expect(fileContent).toContain('your_api_key_here');
      expect(fileContent).not.toContain('production_secret_key');
    });
  });

  describe('Missing .env file handling', () => {
    beforeEach(() => {
      // Ensure .env file does not exist for these tests
      if (fs.existsSync('.env')) {
        fs.unlinkSync('.env');
      }
      // Set required variables in process.env
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3000';
      process.env.APP_NAME = 'TestApp';
      delete process.env.APP_VERSION; // Ensure optional is undefined
    });

    it('should not cause an error when .env file is missing and required vars are in process.env', async () => {
      // We need to re-create the testing module to ensure ConfigService re-initializes
      // with the correct environment state (no .env file).
      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();
      service = module.get<ConfigService>(ConfigService);
      expect(service).toBeDefined(); // If service is defined, no error was thrown during instantiation
    });
  });
});
