import * as path from 'path';

import request from 'supertest';

import { startApp, stopApp, AppInstance, delay } from './utils/app-lifecycle';
import { getLogObjects } from './utils/log-watcher';

const buildTextPayload = (
  suffix: string,
  overrides: Record<string, string> = {},
): Record<string, string> => ({
  taskType: 'TEXT',
  reference: `Reference ${suffix}`,
  template: `Template ${suffix}`,
  studentResponse: `Student response ${suffix}`,
  ...overrides,
});

const countLlmDispatches = (logFilePath: string): number =>
  getLogObjects(logFilePath).filter(
    (log) =>
      typeof log.msg === 'string' &&
      log.msg.includes('Dispatching LLM request'),
  ).length;

describe('Assessor cache behaviour (e2e)', () => {
  describe('Cache hits, misses, and error guards', () => {
    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache.e2e-spec.log',
    );

    beforeAll(async () => {
      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-cache-secret',
        ASSESSOR_CACHE_TTL_MINUTES: '10',
        ASSESSOR_CACHE_MAX_SIZE_MIB: '384',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('returns a cache hit for identical payloads', async () => {
      const payload = buildTextPayload(`hit-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
    });

    it('returns a cache miss for differing payloads', async () => {
      const payloadA = buildTextPayload(`miss-a-${Date.now()}`);
      const payloadB = buildTextPayload(`miss-b-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadB)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(1);
    });

    it('does not cache error responses or overwrite cached success', async () => {
      const payload = buildTextPayload(`guard-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', 'Bearer invalid-api-key')
        .send(payload)
        .expect(401);

      await delay(200);
      const afterThird = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterFourth = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(afterThird - afterSecond).toBe(0);
      expect(afterFourth - afterThird).toBe(0);
    });
  });

  describe('TTL expiry via environment overrides', () => {
    jest.setTimeout(120000);

    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache-ttl.e2e-spec.log',
    );

    beforeAll(async () => {
      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-cache-secret',
        ASSESSOR_CACHE_TTL_MINUTES: '1',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('expires cached entries after TTL', async () => {
      const payload = buildTextPayload(`ttl-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      await delay(65000);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterThird = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(afterThird - afterSecond).toBe(1);
    });
  });

  describe('Size-based eviction', () => {
    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache-size.e2e-spec.log',
    );

    const largePayload = (suffix: string): { [key: string]: string } => {
      const largeText = 'a'.repeat(400 * 1024);
      return buildTextPayload(`size-${suffix}`, {
        studentResponse: largeText,
      });
    };

    beforeAll(async () => {
      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-cache-secret',
        ASSESSOR_CACHE_MAX_SIZE_MIB: '1',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('evicts old entries once the cache exceeds the size cap', async () => {
      const payloadA = largePayload('a');
      const payloadB = largePayload('b');
      const payloadC = largePayload('c');
      const beforeCount = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadB)
        .expect(201);

      await delay(200);
      const afterThird = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadC)
        .expect(201);

      await delay(200);
      const afterFourth = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterFifth = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(afterThird - afterSecond).toBe(1);
      expect(afterFourth - afterThird).toBe(1);
      expect(afterFifth - afterFourth).toBe(1);
    });
  });

  describe('Invalid config startup failures', () => {
    it('fails fast when cache TTL or secret is invalid', async () => {
      const logFilePath = path.join(
        __dirname,
        'logs',
        'assessor-cache-invalid.e2e-spec.log',
      );

      let app: AppInstance | null = null;
      let startupError: unknown;

      try {
        app = await startApp(logFilePath, {
          ASSESSOR_CACHE_TTL_MINUTES: '0',
          ASSESSOR_CACHE_HASH_SECRET: '',
        });
      } catch (err) {
        startupError = err;
      } finally {
        if (app) {
          stopApp(app.appProcess);
        }
      }

      expect(startupError).toBeDefined();
    });
  });
});
