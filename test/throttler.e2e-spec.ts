import { ChildProcessWithoutNullStreams } from 'child_process';

import request from 'supertest';

import { startApp, stopApp } from './utils/e2e-test-utils';

describe('Throttler (e2e)', () => {
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  let unauthenticatedLimit: number;
  let authenticatedLimit: number;
  let ttl: number;
  const logFilePath = '/tmp/e2e-test.log';

  beforeAll(async () => {
    // As we are not testing the throttler service itself, but rather the implementation of the throttler,
    // we can use a short ttl and custom limits to speed up the tests and ensure config is picked up from process.env.
    process.env.THROTTLER_TTL = '5000';
    process.env.UNAUTHENTICATED_THROTTLER_LIMIT = '5';
    process.env.AUTHENTICATED_THROTTLER_LIMIT = '10';

    const testConfig = await startApp(logFilePath);
    appProcess = testConfig.appProcess;
    appUrl = testConfig.appUrl;
    apiKey = testConfig.apiKey;
    unauthenticatedLimit = testConfig.unauthenticatedThrottlerLimit;
    authenticatedLimit = testConfig.authenticatedThrottlerLimit;
    ttl = testConfig.throttlerTtl;
  });

  afterAll(() => {
    stopApp(appProcess);
  });

  // Pause for the TTL after each test to ensure throttling window resets
  afterEach(async () => {
    if (ttl > 0) {
      await new Promise((resolve) => setTimeout(resolve, ttl));
    }
  });

  describe('Unauthenticated Routes', () => {
    it('should allow requests below the unauthenticated limit', async () => {
      const requests = Array(unauthenticatedLimit)
        .fill(0)
        .map(() => request(appUrl).get('/health').expect(200));
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(unauthenticatedLimit);
    });

    it('should reject requests exceeding the unauthenticated limit', async () => {
      const successfulRequests = Array(unauthenticatedLimit)
        .fill(0)
        .map(() => request(appUrl).get('/health').expect(200));
      await Promise.all(successfulRequests);

      const response = await request(appUrl).get('/health');
      expect(response.status).toBe(429);
    });

    it('should include Retry-After header on throttled response', async () => {
      const successfulRequests = Array(unauthenticatedLimit)
        .fill(0)
        .map(() => request(appUrl).get('/health').expect(200));
      await Promise.all(successfulRequests);

      const response = await request(appUrl).get('/health');
      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
      expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
    });

    it('should reset the limit after the TTL expires', async () => {
      // Wait for the TTL to expire
      await new Promise((resolve) => setTimeout(resolve, ttl));

      // The next request should be successful
      const response = await request(appUrl).get('/health');
      expect(response.status).toBe(200);
    }, 15000);
  });

  describe('Authenticated Routes', () => {
    it('should allow requests below the authenticated limit', async () => {
      const requests = Array(authenticatedLimit)
        .fill(0)
        .map(() =>
          request(appUrl)
            .post('/v1/assessor')
            .set('Authorization', `Bearer ${apiKey}`)
            .send({
              taskType: 'TEXT',
              reference: 'The quick brown fox jumps over the lazy dog.',
              template: 'Write a sentence about a fox.',
              studentResponse: 'A fox is a mammal.',
            })
            .expect(201),
        );
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(authenticatedLimit);
    });

    it('should reject requests exceeding the authenticated limit', async () => {
      // Send only the allowed number of requests in parallel
      const allowedRequests = Array(authenticatedLimit)
        .fill(0)
        .map(() =>
          request(appUrl)
            .post('/v1/assessor')
            .set('Authorization', `Bearer ${apiKey}`)
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
      const response = await request(appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          taskType: 'TEXT',
          reference: 'The quick brown fox jumps over the lazy dog.',
          template: 'Write a sentence about a fox.',
          studentResponse: 'A fox is a mammal.',
        });
      expect(response.status).toBe(429);
    });

    it('should reset the limit after the TTL expires', async () => {
      // Wait for the TTL to expire
      await new Promise((resolve) => setTimeout(resolve, ttl));

      const response = await request(appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${apiKey}`)
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
