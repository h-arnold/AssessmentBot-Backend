import { ChildProcessWithoutNullStreams } from 'child_process';

import request from 'supertest';

import { startApp, stopApp, AppInstance } from './utils/app-lifecycle';

describe('Throttler (e2e)', () => {
  let app: AppInstance;
  let authenticatedLimit: number;
  let ttl: number;
  const logFilePath = './test/throttler.e2e-spec.log';

  beforeAll(async () => {
    // As we are not testing the throttler service itself, but rather the implementation of the throttler,
    // we can use a short ttl and custom limits to speed up the tests and ensure config is picked up from process.env.
    const envOverrides = {
      THROTTLER_TTL: '5000',
      UNAUTHENTICATED_THROTTLER_LIMIT: '5',
      AUTHENTICATED_THROTTLER_LIMIT: '10',
    };

    app = await startApp(logFilePath, envOverrides);
  });

  afterAll(() => {
    stopApp(app.appProcess);
  });

  describe('Unauthenticated Routes', () => {
    it('should enforce rate limiting for unauthenticated users', async () => {
      // 1. Allow requests up to the limit
      const successfulRequests = Array(app.unauthenticatedThrottlerLimit)
        .fill(0)
        .map(() => request(app.appUrl).get('/health').expect(200));
      await Promise.all(successfulRequests);

      // 2. Reject requests exceeding the limit and check header
      const throttledResponse = await request(app.appUrl).get('/health');
      expect(throttledResponse.status).toBe(429);
      expect(throttledResponse.headers['retry-after']).toBeDefined();
      expect(
        parseInt(throttledResponse.headers['retry-after'], 10),
      ).toBeGreaterThan(0);

      // 3. Reset the limit after the TTL expires
      await new Promise((resolve) => setTimeout(resolve, app.throttlerTtl));
      const afterResetResponse = await request(app.appUrl).get('/health');
      expect(afterResetResponse.status).toBe(200);
    }, 15000); // Increased timeout to account for all sequential steps
  });

  describe('Authenticated Routes', () => {
    it('should enforce rate limiting for authenticated users', async () => {
      const postData = {
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      };

      // 1. Allow requests up to the limit
      const successfulRequests = Array(app.authenticatedThrottlerLimit)
        .fill(0)
        .map(() =>
          request(app.appUrl)
            .post('/v1/assessor')
            .set('Authorization', `Bearer ${app.apiKey}`)
            .send(postData)
            .expect(201),
        );
      await Promise.all(successfulRequests);

      // 2. Reject requests exceeding the limit
      const throttledResponse = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(postData);
      expect(throttledResponse.status).toBe(429);

      // 3. Reset the limit after the TTL expires
      await new Promise((resolve) => setTimeout(resolve, app.throttlerTtl));
      const afterResetResponse = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(postData);
      expect(afterResetResponse.status).toBe(201);
    }, 15000); // Increased timeout to account for all sequential steps
  });

  it.todo('should log throttled requests (requires log capture setup)');
});
