import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import request from 'supertest';

import { startApp, stopApp, AppInstance, delay } from './utils/app-lifecycle';
import { getLogObjects } from './utils/log-watcher';

/**
 * Helper class for E2E cache tests providing reusable test builders and utilities.
 * Centralises common test setup to reduce duplication across multiple test suites.
 */
class CacheE2ETestHelper {
  /**
   * Builds a TEXT task payload with random suffix to avoid collisions.
   * @param suffix Unique identifier appended to fields for test isolation
   * @param overrides Optional field overrides to customise the payload
   * @returns A TEXT task DTO suitable for the assessor endpoint
   */
  static buildTextPayload(
    suffix: string,
    overrides?: Record<string, string>,
  ): Record<string, string> {
    return {
      taskType: 'TEXT',
      reference: `Reference ${suffix}`,
      template: `Template ${suffix}`,
      studentResponse: `Student response ${suffix}`,
      ...overrides,
    };
  }

  /**
   * Builds an IMAGE task payload with random suffix to avoid collisions.
   * @param suffix Unique identifier appended to fields for test isolation
   * @param overrides Optional field overrides to customise the payload
   * @returns An IMAGE task DTO suitable for the assessor endpoint
   */
  static buildImagePayload(
    suffix: string,
    overrides?: Record<string, unknown>,
  ): Record<string, unknown> {
    const base64 = Buffer.from(`image-${suffix}`).toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;

    return {
      taskType: 'IMAGE',
      reference: dataUri,
      template: dataUri,
      studentResponse: dataUri,
      ...overrides,
    };
  }

  /**
   * Creates a large payload for size-based eviction testing.
   * Each payload is approximately 400 KiB to fit cache limits and trigger eviction.
   * @param suffix Unique identifier for the payload
   * @returns A TEXT task DTO with large studentResponse field
   */
  static buildLargePayload(suffix: string): Record<string, string> {
    const largeText = 'a'.repeat(400 * 1024);
    return this.buildTextPayload(`size-${suffix}`, {
      studentResponse: largeText,
    });
  }

  /**
   * Counts LLM dispatch events from the log file.
   * **IMPORTANT**: This depends on the LLM service logging the message "Dispatching LLM request".
   * If the LLM service changes its logging message, all tests using this counter will fail.
   * See: src/llm/llm.service.ts
   * @param logFilePath Path to the log file to analyse
   * @returns Number of LLM dispatch events found in the log file
   */
  static countLlmDispatches(logFilePath: string): number {
    return getLogObjects(logFilePath).filter(
      (log) =>
        typeof log.msg === 'string' &&
        log.msg.includes('Dispatching LLM request'),
    ).length;
  }
}

const buildTextPayload = (
  suffix: string,
  overrides: Record<string, string> = {},
): Record<string, string> =>
  CacheE2ETestHelper.buildTextPayload(suffix, overrides);

const buildImagePayload = (
  suffix: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> =>
  CacheE2ETestHelper.buildImagePayload(suffix, overrides);

const countLlmDispatches = (logFilePath: string): number =>
  CacheE2ETestHelper.countLlmDispatches(logFilePath);

const waitForDispatchCount = async (
  logFilePath: string,
  expectedCount: number,
  timeoutMs = 10000,
): Promise<number> => {
  const startTime = Date.now();
  let currentCount = countLlmDispatches(logFilePath);

  while (currentCount < expectedCount) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(
        `Timed out waiting for ${expectedCount} LLM dispatch logs; last count: ${currentCount}`,
      );
    }

    await delay(100);
    currentCount = countLlmDispatches(logFilePath);
  }

  return currentCount;
};

const assertDispatchCountStable = async (
  logFilePath: string,
  expectedCount: number,
  windowMs = 2000,
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < windowMs) {
    const currentCount = countLlmDispatches(logFilePath);
    if (currentCount > expectedCount) {
      throw new Error(
        `Expected dispatch count to remain at ${expectedCount}, but saw ${currentCount}`,
      );
    }

    await delay(100);
  }
};

describe('Assessor cache behaviour (e2e)', () => {
  describe('Cache hits, misses, and error guards', () => {
    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache.e2e-spec.log',
    );

    beforeAll(async () => {
      // Clear log file before starting tests to ensure baseline count is from this test only
      // (in case tests run multiple times against same process)
      try {
        fs.truncateSync(logFilePath, 0);
      } catch {
        // Log file may not exist yet, that's OK
      }

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

    it('does not cache 400/422 responses', async () => {
      const invalidPayload = {
        taskType: 'TEXT',
        reference: '',
        template: 'Template',
        studentResponse: 'Response',
      };
      const beforeCount = countLlmDispatches(logFilePath);

      const response = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(invalidPayload);

      await delay(200);
      const afterInvalid = countLlmDispatches(logFilePath);

      const payload = buildTextPayload(`bad-${Date.now()}`);
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterValid = countLlmDispatches(logFilePath);

      expect([400, 422]).toContain(response.status);
      expect(afterInvalid - beforeCount).toBe(0);
      expect(afterValid - afterInvalid).toBe(1);
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
      try {
        fs.truncateSync(logFilePath, 0);
      } catch {
        // Log file may not exist yet, that's OK
      }

      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-cache-secret',
        ASSESSOR_CACHE_TTL_MINUTES: '1',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('flushes dispatch logs after a long idle period', async () => {
      const payload = buildTextPayload(`idle-first-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await waitForDispatchCount(logFilePath, beforeCount + 1);

      await delay(65000);

      const secondPayload = buildTextPayload(`idle-second-${Date.now()}`);
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(secondPayload)
        .expect(201);

      const afterSecond = await waitForDispatchCount(
        logFilePath,
        beforeCount + 2,
      );

      expect(afterSecond).toBe(beforeCount + 2);
    });

    it('keeps dispatch counts stable once logs are flushed', async () => {
      const payload = buildTextPayload(`stable-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      const afterCount = await waitForDispatchCount(
        logFilePath,
        beforeCount + 1,
      );

      expect(afterCount).toBe(beforeCount + 1);
      await assertDispatchCountStable(logFilePath, afterCount);
    });

    it('expires cached entries after TTL', async () => {
      const payload = buildTextPayload(`ttl-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      // First request: cache miss (LLM is called)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      const afterFirst = await waitForDispatchCount(
        logFilePath,
        beforeCount + 1,
      );

      // Second request: cache hit (same payload, before TTL expires)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      const afterSecond = countLlmDispatches(logFilePath);
      await assertDispatchCountStable(logFilePath, afterFirst);

      // CRITICAL: Wait for TTL to expire (1 minute = 60 seconds)
      // Wait 75 seconds to account for timing variations:
      // - Clock skew and timing variations in Node.js
      // - Event loop delays
      // - Cache expiration not happening exactly at 60s mark
      // - CI runner scheduling overhead
      await delay(75000);

      // Third request: cache miss (TTL expired, LLM is called again)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      const afterThird = await waitForDispatchCount(
        logFilePath,
        afterSecond + 1,
      );

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(afterThird - afterSecond).toBe(1);
    });
  });

  describe('TTL hours precedence', () => {
    jest.setTimeout(120000);

    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache-ttl-hours.e2e-spec.log',
    );

    beforeAll(async () => {
      try {
        fs.truncateSync(logFilePath, 0);
      } catch {
        // Log file may not exist yet, that's OK
      }

      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-cache-secret',
        ASSESSOR_CACHE_TTL_MINUTES: '1',
        ASSESSOR_CACHE_TTL_HOURS: '1',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('prefers TTL hours when both hours and minutes are set', async () => {
      const payload = buildTextPayload(`ttl-hours-${Date.now()}`);
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

      await delay(70000);

      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterThird = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(afterThird - afterSecond).toBe(0);
    });
  });

  describe('Size-based eviction', () => {
    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache-size.e2e-spec.log',
    );

    beforeAll(async () => {
      try {
        fs.truncateSync(logFilePath, 0);
      } catch {
        // Log file may not exist yet, that's OK
      }

      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-cache-secret',
        ASSESSOR_CACHE_MAX_SIZE_MIB: '1',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('evicts old entries once the cache exceeds the size cap', async () => {
      // Create 400 KiB payloads.
      // With 1 MiB cache limit and 3 payloads (1.2 MiB total with overhead),
      // eviction will trigger after the 3rd request, evicting the oldest entry (payloadA).
      const payloadA = CacheE2ETestHelper.buildLargePayload('a');
      const payloadB = CacheE2ETestHelper.buildLargePayload('b');
      const payloadC = CacheE2ETestHelper.buildLargePayload('c');
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

      // At this point, payloadA has been evicted from the cache (oldest entry).
      // Request it again to verify it must be recomputed.
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
        // Clear log file before starting test
        try {
          fs.truncateSync(logFilePath, 0);
        } catch {
          // Log file may not exist yet, that's OK
        }

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

    it('fails fast when cache size is invalid', async () => {
      const logFilePath = path.join(
        __dirname,
        'logs',
        'assessor-cache-invalid-size.e2e-spec.log',
      );

      let app: AppInstance | null = null;
      let startupError: unknown;

      try {
        try {
          fs.truncateSync(logFilePath, 0);
        } catch {
          // Log file may not exist yet, that's OK
        }

        app = await startApp(logFilePath, {
          ASSESSOR_CACHE_HASH_SECRET: 'e2e-cache-secret',
          ASSESSOR_CACHE_MAX_SIZE_MIB: '0',
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

  describe('Security-focused cache attack coverage', () => {
    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache-security.e2e-spec.log',
    );

    beforeAll(async () => {
      try {
        fs.truncateSync(logFilePath, 0);
      } catch {
        // Log file may not exist yet, that's OK
      }

      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-security-secret',
        ASSESSOR_CACHE_TTL_MINUTES: '10',
        ASSESSOR_CACHE_MAX_SIZE_MIB: '384',
        AUTHENTICATED_THROTTLER_LIMIT: '100',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('cache key inference: single-character payload differences cause cache misses', async () => {
      const payloadA = buildTextPayload(`sec-char-a-${Date.now()}`);
      const payloadB = {
        ...payloadA,
        studentResponse: payloadA.studentResponse + 'x',
      };

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

    it('canonicalisation: reordered JSON keys map to the same cache entry', async () => {
      const payload = buildTextPayload(`sec-canon-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      const response1 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      const reorderedPayload = {
        studentResponse: payload.studentResponse,
        template: payload.template,
        reference: payload.reference,
        taskType: payload.taskType,
      };

      const response2 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(reorderedPayload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(response1.body).toEqual(response2.body);
    });

    it('cross-request contamination: alternating distinct payloads do not leak responses', async () => {
      const payloadA = buildTextPayload(`sec-alt-a-${Date.now()}`);
      const payloadB = buildTextPayload(`sec-alt-b-${Date.now()}`);

      const responseA1 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);

      const responseB1 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadB)
        .expect(201);

      await delay(200);

      const responseA2 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);

      const responseB2 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadB)
        .expect(201);

      await delay(200);

      expect(responseA1.body).toEqual(responseA2.body);
      expect(responseB1.body).toEqual(responseB2.body);
    });

    it('replay with modified headers: cache hits based solely on DTO, not headers', async () => {
      const payload = buildTextPayload(`sec-replay-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      const response1 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .set('User-Agent', 'Custom-UA-1')
        .send(payload)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      const response2 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .set('User-Agent', 'Different-UA-2')
        .send(payload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(response1.body).toEqual(response2.body);
    });

    it('large payload cache poisoning: maximum-size payloads remain correctly cached', async () => {
      const largeText = 'a'.repeat(100 * 1024);
      const payloadLarge = buildTextPayload(`sec-large-${Date.now()}`, {
        studentResponse: largeText,
      });

      const beforeCount = countLlmDispatches(logFilePath);

      const response1 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadLarge)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      const response2 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadLarge)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(response1.body).toEqual(response2.body);
    });

    it('cache hits are shared across valid API keys', async () => {
      const payload = buildTextPayload(`sec-api-key-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      // First request with valid API key: cache miss (LLM is called)
      const response1 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      // Second request with another valid API key: should be a cache hit
      const response3 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey2}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(response1.body).toEqual(response3.body);
    });

    it('system prompt template drift does not affect cache keys', async () => {
      const suffix = `tmpl-v-${Date.now()}`;
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'assessor-cache-system-prompt-'),
      );
      const promptPath = path.join(tempDir, 'system.prompt.md');

      try {
        fs.writeFileSync(promptPath, 'system prompt v1');

        const payload = buildImagePayload(suffix, {
          systemPromptFile: promptPath,
        });

        const beforeCount = countLlmDispatches(logFilePath);

        // First request: cache miss
        await request(app.appUrl)
          .post('/v1/assessor')
          .set('Authorization', `Bearer ${app.apiKey}`)
          .send(payload)
          .expect(201);

        await delay(200);
        const afterFirst = countLlmDispatches(logFilePath);

        fs.writeFileSync(promptPath, 'system prompt v2');

        // Second request with same DTO: cache hit (prompt drift excluded)
        await request(app.appUrl)
          .post('/v1/assessor')
          .set('Authorization', `Bearer ${app.apiKey}`)
          .send(payload)
          .expect(201);

        await delay(200);
        const afterSecond = countLlmDispatches(logFilePath);

        expect(afterFirst - beforeCount).toBe(1);
        expect(afterSecond - afterFirst).toBe(0);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Eviction race (small cache)', () => {
    let app: AppInstance;
    const logFilePath = path.join(
      __dirname,
      'logs',
      'assessor-cache-eviction-race.e2e-spec.log',
    );

    beforeAll(async () => {
      try {
        fs.truncateSync(logFilePath, 0);
      } catch {
        // Log file may not exist yet, that's OK
      }

      app = await startApp(logFilePath, {
        ASSESSOR_CACHE_HASH_SECRET: 'e2e-eviction-race-secret',
        ASSESSOR_CACHE_TTL_MINUTES: '10',
        ASSESSOR_CACHE_MAX_SIZE_MIB: '1',
        AUTHENTICATED_THROTTLER_LIMIT: '100',
      });
    });

    afterAll(() => {
      stopApp(app.appProcess);
    });

    it('eviction race: immediately requesting evicted entry triggers recomputation', async () => {
      // With a small cache (1 MiB), we can force eviction and then immediately request the evicted entry
      // Use buildLargePayload which creates ~400 KiB payloads
      // 3 payloads (1.2 MiB total) exceeds 1 MiB cache, forcing eviction of the oldest
      const suffixA = `evict-race-a-${Date.now()}`;
      const suffixB = `evict-race-b-${Date.now()}`;
      const suffixC = `evict-race-c-${Date.now()}`;

      const payloadA = CacheE2ETestHelper.buildLargePayload(suffixA);
      const payloadB = CacheE2ETestHelper.buildLargePayload(suffixB);
      const payloadC = CacheE2ETestHelper.buildLargePayload(suffixC);

      const beforeCount = countLlmDispatches(logFilePath);

      // First request: cache miss (payloadA stored)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      // Second request (same payload): cache hit
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      // Third request: cache miss (payloadB stored, cache now ~800 KiB)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadB)
        .expect(201);

      await delay(200);
      const afterThird = countLlmDispatches(logFilePath);

      // Fourth request: cache miss (payloadC stored, exceeds 1 MiB → payloadA evicted)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadC)
        .expect(201);

      await delay(200);
      const afterFourth = countLlmDispatches(logFilePath);

      // Fifth request: payloadA was evicted, so this is a cache miss
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
      // The evicted entry should be recomputed
      expect(afterFifth - afterFourth).toBe(1);
    });
  });
});
