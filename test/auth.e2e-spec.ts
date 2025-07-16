import {
  ConsoleLogger,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import request from 'supertest';

import { HttpExceptionFilter } from './../src/common/http-exception.filter';
import { ZodValidationPipe } from './../src/common/zod-validation.pipe';
import { ConfigService } from './../src/config/config.service';
import { TestAppModule } from './test-app.module';

dotenv.config({ path: '.test.env' });

describe('Authentication E2E Tests', () => {
  let app: INestApplication;
  let configService: ConfigService;

  const VALID_API_KEY = 'test_api_key_123';
  const ANOTHER_VALID_API_KEY = 'another_test_key_456';
  const INVALID_API_KEY = 'invalid_key';

  beforeEach(async () => {
    // Environment variables are loaded from .test.env
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);
    // Use console logger to ensure debug output is visible
    const logger = new ConsoleLogger();
    logger.setLogLevels(configService.get('LOG_LEVEL'));
    app.useLogger(logger);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    // No need to clean up environment variables, dotenv only loads once
  });

  // 2.1 Protected Routes
  it('Protected route without API key returns 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Unauthorized');
  });

  it('Protected route with invalid API key returns 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${INVALID_API_KEY}`)
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Invalid API key');
  });

  it('Protected route with valid API key returns 200 OK and includes authenticated user context in the response body', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${ANOTHER_VALID_API_KEY}`)
      .expect(200);

    expect(response.body).toHaveProperty(
      'message',
      'This is a protected endpoint',
    );
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('apiKey', ANOTHER_VALID_API_KEY);
  });

  // 2.2 Unprotected Routes
  it('GET / (root) remains accessible without an API key', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.text).toBe('Hello World!');
  });

  // 2.3 Error Response Format
  it('Unauthorized responses use the consistent error format from HttpExceptionFilter', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Unauthorized');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('path', '/protected');
  });

  // 2.4 Header Format and Edge Cases
  it('Request with malformed Authorization header returns 401 Unauthorized', async () => {
    const response1 = await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', 'invalid-format')
      .expect(401);
    expect(response1.body).toHaveProperty('statusCode', 401);

    const response2 = await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', 'Bearer') // Missing token
      .expect(401);
    expect(response2.body).toHaveProperty('statusCode', 401);
  });

  it('Request with empty Authorization header returns 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', 'Bearer ') // Just spaces
      .expect(401);
    expect(response.body).toHaveProperty('statusCode', 401);
  });

  it('API key validation is case-sensitive', async () => {
    // Assuming API_KEY is 'test_api_key_123'
    const response = await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${VALID_API_KEY.toUpperCase()}`)
      .expect(401); // Should be unauthorized if case-sensitive
    expect(response.body).toHaveProperty('statusCode', 401);
  });

  // 3.1 Health Endpoint
  it('/health endpoint response format remains unchanged and accessible without a key', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('version');
  });

  // 3.2 CommonModule Integration
  it('HttpExceptionFilter from CommonModule correctly handles UnauthorizedException thrown by the ApiKeyGuard', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Unauthorized');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('path', '/protected');
  });
});
