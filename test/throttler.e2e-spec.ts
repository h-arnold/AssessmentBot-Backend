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
  const logFilePath = '/workspaces/AssessmentBot-Backend/e2e-test.log';

  beforeAll(async () => {
    // As we are not testing the throttler service itself, but rather the implementation of the throttler,
    // we can use a short ttl to speed up the tests.
    process.env.THROTTLER_TTL = '10';
    const testConfig = await startApp(logFilePath);
    appProcess = testConfig.appProcess;
    appUrl = testConfig.appUrl;
    apiKey = testConfig.apiKey;
    unauthenticatedLimit = testConfig.unauthenticatedThrottlerLimit;
    authenticatedLimit = testConfig.authenticatedThrottlerLimit;
    ttl = testConfig.throttlerTtl;
  }, 30000);

  afterAll(() => {
    stopApp(appProcess);
  });

  describe('Unauthenticated Routes', () => {
    it('should allow requests below the unauthenticated limit', async () => {
      const requests = Array(unauthenticatedLimit - 1)
        .fill(0)
        .map(() => {
          return request(appUrl).get('/health').expect(200);
        });
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(unauthenticatedLimit - 1);
    });

    it('should reject requests exceeding the unauthenticated limit', async () => {
      const requests = Array(unauthenticatedLimit - 1)
        .fill(0)
        .map(() => {
          return request(appUrl).get('/health').expect(200);
        });
      await Promise.all(requests);

      const response = await request(appUrl).get('/health');
      expect(response.status).toBe(429);
    });

    it('should include Retry-After header on throttled response', async () => {
      const requests = Array(unauthenticatedLimit - 1)
        .fill(0)
        .map(() => {
          return request(appUrl).get('/health').expect(200);
        });
      await Promise.all(requests);

      const response = await request(appUrl).get('/health');
      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
      expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
    });

    it('should reset the limit after the TTL expires', async () => {
      await new Promise((resolve) => setTimeout(resolve, ttl * 1000));
      const response = await request(appUrl).get('/health');
      expect(response.status).toBe(200);
    }, 15000);
  });

  describe('Authenticated Routes', () => {
    it('should allow requests below the authenticated limit', async () => {
      const requests = Array(authenticatedLimit)
        .fill(0)
        .map(() => {
          return request(appUrl)
            .post('/v1/assessor')
            .set('Authorization', `Bearer ${apiKey}`)
            .send({
              taskType: 'TEXT',
              reference: 'The quick brown fox jumps over the lazy dog.',
              template: 'Write a sentence about a fox.',
              studentResponse: 'A fox is a mammal.',
            })
            .expect(201);
        });
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(authenticatedLimit);
    });

    it('should reject requests exceeding the authenticated limit', async () => {
      const requests = Array(authenticatedLimit)
        .fill(0)
        .map(() => {
          return request(appUrl)
            .post('/v1/assessor')
            .set('Authorization', `Bearer ${apiKey}`)
            .send({
              taskType: 'TEXT',
              reference: 'The quick brown fox jumps over the lazy dog.',
              template: 'Write a sentence about a fox.',
              studentResponse: 'A fox is a mammal.',
            })
            .expect(201);
        });
      await Promise.all(requests);

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
      await new Promise((resolve) => setTimeout(resolve, ttl * 1000));
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