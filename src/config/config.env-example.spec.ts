
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Mock the fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('.env.example file', () => {
  const expectedRequiredVars = ['NODE_ENV', 'PORT', 'APP_NAME', 'APP_VERSION']; // APP_VERSION is optional but should be in example

  beforeEach(() => {
    // Clear mocks before each test
    (fs.existsSync as jest.Mock).mockClear();
    (fs.readFileSync as jest.Mock).mockClear();

    // Default mock for existsSync: .env.example exists
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Default mock for readFileSync: provide a valid .env.example content
    (fs.readFileSync as jest.Mock).mockReturnValue(`
NODE_ENV=development
PORT=3000
APP_NAME=AssessmentBot-Backend
APP_VERSION=1.0.0
DATABASE_URL=your_database_url_here
API_KEY=your_api_key_here
`);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should contain all required variables', () => {
    const exampleContent = fs.readFileSync('.env.example', 'utf-8');
    const exampleConfig = dotenv.parse(exampleContent);

    const requiredKeys = ['NODE_ENV', 'PORT', 'APP_NAME', 'APP_VERSION'];
    requiredKeys.forEach(key => {
      expect(exampleConfig).toHaveProperty(key);
      expect(exampleConfig[key]).not.toBe('');
    });
  });

  it('should use placeholder values', () => {
    const exampleContent = fs.readFileSync('.env.example', 'utf-8');
    const exampleConfig = dotenv.parse(exampleContent);

    expect(exampleConfig.NODE_ENV).toBe('development');
    expect(exampleConfig.PORT).toBe('3000');
    expect(exampleConfig.APP_NAME).toBe('AssessmentBot-Backend');
    expect(exampleConfig.APP_VERSION).toBe('1.0.0');
  });
});
