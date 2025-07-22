import { ChildProcessWithoutNullStreams } from 'child_process';

import request from 'supertest';

import { startApp, stopApp } from './utils/e2e-test-utils';

describe('Throttler (e2e)', () => {
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  let apiKey2: string;
  let limit: number;
  let ttl: number;
  const logFilePath = '/workspaces/AssessmentBot-Backend/e2e-test.log';

  beforeAll(async () => {
    const testConfig = await startApp(logFilePath);
    appProcess = testConfig.appProcess;
    appUrl = testConfig.appUrl;
    apiKey = testConfig.apiKey;
    apiKey2 = testConfig.apiKey2;
    limit = testConfig.throttlerLimit;
    ttl = testConfig.throttlerTtl;
  }, 30000);

  afterAll(() => {
    stopApp(appProcess);
  });

  it('should allow requests below limit', async () => {
    const requests = Array(limit - 1)
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
    expect(responses.length).toBe(limit - 1);
  });

  it('should reject requests exceeding limit', async () => {
    const requests = Array(limit)
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

  it('should include Retry-After header on throttled response', async () => {
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

  it('should reset limit after TTL expires', async () => {
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
  }, 70000);

  it('should throttle keys independently', async () => {
    const requests = Array(limit)
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

    const independentResponse = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey2}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });
    expect(independentResponse.status).toBe(201);
  });

  it('should fallback to IP throttling if no key provided', async () => {
    const requests = Array(limit)
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
          .expect(401); // Unauthorized
      });
    await Promise.all(requests);

    const response = await request(appUrl).post('/v1/assessor').send({
      taskType: 'TEXT',
      reference: 'The quick brown fox jumps over the lazy dog.',
      template: 'Write a sentence about a fox.',
      studentResponse: 'A fox is a mammal.',
    });
    expect(response.status).toBe(429);
  });

  it.todo('should log throttled requests (requires log capture setup)');
});
