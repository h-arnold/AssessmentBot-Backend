import { ChildProcessWithoutNullStreams } from 'child_process';

import request from 'supertest';

import { startApp, stopApp } from './utils/e2e-test-utils';

describe('Throttler (e2e)', () => {
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  let apiKey2: string;
  let anonymousThrottlerLimit: number;
  let anonymousThrottlerTtl: number;
  let authenticatedThrottlerLimit: number;
  let authenticatedThrottlerTtl: number;
  const logFilePath = '/workspaces/AssessmentBot-Backend/e2e-test.log';

  beforeAll(async () => {
    const testConfig = await startApp(logFilePath);
    appProcess = testConfig.appProcess;
    appUrl = testConfig.appUrl;
    apiKey = testConfig.apiKey;
    apiKey2 = testConfig.apiKey2;
    anonymousThrottlerLimit = testConfig.anonymousThrottlerLimit;
    anonymousThrottlerTtl = testConfig.anonymousThrottlerTtl;
    authenticatedThrottlerLimit = testConfig.authenticatedThrottlerLimit;
    authenticatedThrottlerTtl = testConfig.authenticatedThrottlerTtl;
  }, 30000);

  afterAll(() => {
    stopApp(appProcess);
  });

  it('Test Case 2: should throttle requests with a valid API key according to the authenticated limit', async () => {
    const requests = Array(authenticatedThrottlerLimit)
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
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
  });

  it('Test Case 1: should throttle requests without an API key according to the anonymous limit', async () => {
    const requests = Array(anonymousThrottlerLimit)
      .fill(0)
      .map(() => {
        return request(appUrl)
          .post('/v1/assessor')
          .send({
            taskType: 'TEXT',
            reference: 'The quick brown fox jumps over the lazy dog.',
            template: 'Write a sentence about a fox.',
            studentResponse: 'A fox is a mammal.',
          })
          .expect(401); // Expect 401 from ApiKeyGuard first
      });
    await Promise.all(requests);

    // The next request should be throttled at the anonymous level
    const response = await request(appUrl).post('/v1/assessor').send({
      taskType: 'TEXT',
      reference: 'The quick brown fox jumps over the lazy dog.',
      template: 'Write a sentence about a fox.',
      studentResponse: 'A fox is a mammal.',
    });
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
  });

  it('Test Case 3: should throttle requests with an invalid API key using the anonymous limit and then reject with 401', async () => {
    const invalidApiKey = 'invalid-api-key';
    // First, hit the anonymous limit
    for (let i = 0; i < anonymousThrottlerLimit; i++) {
      await request(appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${invalidApiKey}`)
        .send({
          taskType: 'TEXT',
          reference: 'The quick brown fox jumps over the lazy dog.',
          template: 'Write a sentence about a fox.',
          studentResponse: 'A fox is a mammal.',
        })
        .expect(401); // Invalid API key should result in 401
    }

    // The next request with the invalid key should be throttled at the anonymous level
    const response = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${invalidApiKey}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
  });

  it('Test Case 4: should throttle different valid API keys independently', async () => {
    // Hit the limit for apiKey
    const requests1 = Array(authenticatedThrottlerLimit)
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
    await Promise.all(requests1);

    const throttledResponse1 = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });
    expect(throttledResponse1.status).toBe(429);
    expect(throttledResponse1.headers['retry-after']).toBeDefined();

    // apiKey2 should still be able to make requests
    const independentResponse2 = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey2}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });
    expect(independentResponse2.status).toBe(201);
  });

  it('Test Case 5: should include Retry-After header on all throttled (429) responses', async () => {
    // This test case is implicitly covered by Test Case 1, 2, 3, and 4
    // where we explicitly check for the 'retry-after' header on 429 responses.
    // Adding a redundant test for clarity if needed, but it's already verified.
    // For example, re-running a scenario that leads to 429 and checking the header.

    // Scenario: Authenticated user hits limit
    const requests = Array(authenticatedThrottlerLimit)
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
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
  });

  it('should reset authenticated limit after TTL expires', async () => {
    // First, hit the authenticated limit
    const requests = Array(authenticatedThrottlerLimit)
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

    // Verify it's throttled
    const throttledResponse = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });
    expect(throttledResponse.status).toBe(429);

    // Wait for TTL to expire
    await new Promise((resolve) =>
      setTimeout(resolve, authenticatedThrottlerTtl * 1000),
    );

    // Should be able to make a request again
    const responseAfterTtl = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });
    expect(responseAfterTtl.status).toBe(201);
  }, 70000); // Increased timeout for TTL reset test

  it('should reset anonymous limit after TTL expires', async () => {
    // First, hit the anonymous limit
    for (let i = 0; i < anonymousThrottlerLimit; i++) {
      await request(appUrl)
        .post('/v1/assessor')
        .send({
          taskType: 'TEXT',
          reference: 'The quick brown fox jumps over the lazy dog.',
          template: 'Write a sentence about a fox.',
          studentResponse: 'A fox is a mammal.',
        })
        .expect(401);
    }

    // Verify it's throttled
    const throttledResponse = await request(appUrl).post('/v1/assessor').send({
      taskType: 'TEXT',
      reference: 'The quick brown fox jumps over the lazy dog.',
      template: 'Write a sentence about a fox.',
      studentResponse: 'A fox is a mammal.',
    });
    expect(throttledResponse.status).toBe(429);

    // Wait for TTL to expire
    await new Promise((resolve) =>
      setTimeout(resolve, anonymousThrottlerTtl * 1000),
    );

    // Should be able to make a request again (will still be 401 due to no API key)
    const responseAfterTtl = await request(appUrl).post('/v1/assessor').send({
      taskType: 'TEXT',
      reference: 'The quick brown fox jumps over the lazy dog.',
      template: 'Write a sentence about a fox.',
      studentResponse: 'A fox is a mammal.',
    });
    expect(responseAfterTtl.status).toBe(401);
  }, 70000); // Increased timeout for TTL reset test

  it.todo('should log throttled requests (requires log capture setup)');
});
