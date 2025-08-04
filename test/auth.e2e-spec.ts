import { ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';

import request from 'supertest';

import { startApp, stopApp } from './utils/app-lifecycle';

describe('Authentication E2E Tests', () => {
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  const logFilePath = path.join(__dirname, 'logs', 'auth.e2e-spec.log');

  const INVALID_API_KEY = 'invalid_key';

  beforeAll(async () => {
    const app = await startApp(logFilePath);
    appProcess = app.appProcess;
    appUrl = app.appUrl;
    apiKey = app.apiKey;
  }, 10000);

  afterAll(() => {
    stopApp(appProcess);
  });

  // 2.1 Protected Routes
  it('Protected route without API key returns 401 Unauthorized', async () => {
    const response = await request(appUrl).get('/check-auth').expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Unauthorized');
  });

  it('Protected route with invalid API key returns 401 Unauthorized', async () => {
    const response = await request(appUrl)
      .get('/check-auth')
      .set('Authorization', `Bearer ${INVALID_API_KEY}`)
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Invalid API key');
  });

  it('Protected route with valid API key returns 200 OK and includes authenticated user context in the response body', async () => {
    const response = await request(appUrl)
      .get('/check-auth')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);

    expect(response.body).toHaveProperty(
      'message',
      'This is a protected endpoint',
    );
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('apiKey', apiKey);
  });

  // 2.2 Unprotected Routes
  it('GET / (root) remains accessible without an API key', async () => {
    const response = await request(appUrl).get('/').expect(200);

    expect(response.text).toBe('Hello World!');
  });

  // 2.3 Error Response Format
  it('Unauthorized responses use the consistent error format from HttpExceptionFilter', async () => {
    const response = await request(appUrl).get('/check-auth').expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Unauthorized');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('path', '/check-auth');
  });

  // 2.4 Header Format and Edge Cases
  it('Request with malformed Authorization header returns 401 Unauthorized', async () => {
    const response1 = await request(appUrl)
      .get('/check-auth')
      .set('Authorization', 'invalid-format')
      .expect(401);
    expect(response1.body).toHaveProperty('statusCode', 401);

    const response2 = await request(appUrl)
      .get('/check-auth')
      .set('Authorization', 'Bearer') // Missing token
      .expect(401);
    expect(response2.body).toHaveProperty('statusCode', 401);
  });

  it('Request with empty Authorization header returns 401 Unauthorized', async () => {
    const response = await request(appUrl)
      .get('/check-auth')
      .set('Authorization', 'Bearer ') // Just spaces
      .expect(401);
    expect(response.body).toHaveProperty('statusCode', 401);
  });

  it('API key validation is case-sensitive', async () => {
    // Assuming API_KEY is 'test_api_key_123'
    const response = await request(appUrl)
      .get('/check-auth')
      .set('Authorization', `Bearer ${apiKey.toUpperCase()}`)
      .expect(401); // Should be unauthorized if case-sensitive
    expect(response.body).toHaveProperty('statusCode', 401);
  });

  // 3.1 Health Endpoint
  it('/health endpoint response format remains unchanged and accessible without a key', async () => {
    const response = await request(appUrl).get('/health').expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('version');
  });

  // 3.2 CommonModule Integration
  it('HttpExceptionFilter from CommonModule correctly handles UnauthorizedException thrown by the ApiKeyGuard', async () => {
    const response = await request(appUrl).get('/check-auth').expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'Unauthorized');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('path', '/check-auth');
  });
});
