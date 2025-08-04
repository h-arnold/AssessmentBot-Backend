import { ChildProcessWithoutNullStreams } from 'child_process';

import request from 'supertest';

import { startApp, stopApp, AppInstance } from './utils/app-lifecycle';

describe('Throttler (e2e)', () => {
  let app: AppInstance;
  let authenticatedLimit: number;
  let ttl: number;
  const logFilePath = '/tmp/e2e-test.log';

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
    it('should allow requests below the unauthenticated limit', async () => {
      const requests = Array(app.unauthenticatedThrottlerLimit)
        .fill(0)
        .map(() => request(app.appUrl).get('/health').expect(200));
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(app.unauthenticatedThrottlerLimit);
    });

    it('should reject requests exceeding the unauthenticated limit', async () => {
      const successfulRequests = Array(app.unauthenticatedThrottlerLimit)
        .fill(0)
        .map(() => request(app.appUrl).get('/health').expect(200));
      await Promise.all(successfulRequests);

      const response = await request(app.appUrl).get('/health');
      expect(response.status).toBe(429);
    });

    it('should include Retry-After header on throttled response', async () => {
      const successfulRequests = Array(app.unauthenticatedThrottlerLimit)
        .fill(0)
        .map(() => request(app.appUrl).get('/health').expect(200));
      await Promise.all(successfulRequests);

      const response = await request(app.appUrl).get('/health');
      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
      expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
    });

    it('should reset the limit after the TTL expires', async () => {
      await new Promise((resolve) => setTimeout(resolve, app.throttlerTtl));
      // The next request should be successful
      const response = await request(app.appUrl).get('/health');
      expect(response.status).toBe(200);
    }, 15000);
  });

  describe('Authenticated Routes', () => {
    it('should allow requests below the authenticated limit', async () => {
      const requests = Array(app.authenticatedThrottlerLimit)
        .fill(0)
        .map(() =>
          request(app.appUrl)
            .post('/v1/assessor')
            .set('Authorization', `Bearer ${app.apiKey}`)
            .send({
              taskType: 'TEXT',
              reference: 'The quick brown fox jumps over the lazy dog.',
              template: 'Write a sentence about a fox.',
              studentResponse: 'A fox is a mammal.',
            })
            .expect(201),
        );
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(app.authenticatedThrottlerLimit);
    });

    it('should reject requests exceeding the authenticated limit', async () => {
      // Send only the allowed number of requests in parallel
      const allowedRequests = Array(app.authenticatedThrottlerLimit)
        .fill(0)
        .map(() =>
          request(app.appUrl)
            .post('/v1/assessor')
            .set('Authorization', `Bearer ${app.apiKey}`)
            .send({
              taskType: 'TEXT',
              reference: 'The quick brown fox jumps over the lazy dog.',
              template: 'Write a sentence about a fox.',
              studentResponse: 'A fox is a mammal.',
            })
            .expect(201),
        );
      await Promise.all(allowedRequests);

      // Now send the overflow request, which should be throttled
      const response = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send({
          taskType: 'TEXT',
          reference: 'The quick brown fox jumps over the lazy dog.',
          template: 'Write a sentence about a fox.',
          studentResponse: 'A fox is a mammal.',
        });
      expect(response.status).toBe(429);
    });

    it('should reset the limit after the TTL expires', async () => {
      await new Promise((resolve) => setTimeout(resolve, app.throttlerTtl));

      const response = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send({
          taskType: 'TEXT',
          reference: 'The quick brown fox jumps over the lazy dog.',
          template: 'Write a sentence about a fox.',
          studentResponse: 'A fox is a mammal.',
        });
      expect(response.status).toBe(201);
    }, 15000);
  });

  it.todo('should log throttled requests (requires log capture setup)');
});
