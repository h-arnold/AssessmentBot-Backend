import * as fs from 'node:fs';
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
): Record<string, string> => CacheE2ETestHelper.buildTextPayload(suffix, overrides);

const countLlmDispatches = (logFilePath: string): number =>
  CacheE2ETestHelper.countLlmDispatches(logFilePath);

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

    it('expires cached entries after TTL', async () => {
      const payload = buildTextPayload(`ttl-${Date.now()}`);
      const beforeCount = countLlmDispatches(logFilePath);

      // First request: cache miss (LLM is called)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      // Brief delay to ensure log is written
      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      // Second request: cache hit (same payload, before TTL expires)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      // CRITICAL: Wait for TTL to expire (1 minute = 60 seconds)
      // Wait 70 seconds to account for timing variations:
      // - Clock skew and timing variations in Node.js
      // - Event loop delays
      // - Cache expiration not happening exactly at 60s mark
      await delay(70000);

      // Third request: cache miss (TTL expired, LLM is called again)
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

      const response1 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      const response2 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadB)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(1);
      expect(response1.body).not.toEqual(response2.body);
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
      expect(responseA1.body).not.toEqual(responseB1.body);
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

    it('cache hits are not affected by API key differences', async () => {
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

      // Second request with invalid API key: should fail authentication before cache lookup
      const invalidKeyResponse = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', 'Bearer different-invalid-key')
        .send(payload);

      await delay(200);
      const afterInvalidAttempt = countLlmDispatches(logFilePath);

      // Third request with valid API key again: should be a cache hit
      // (demonstrating cache is global, not scoped by API key)
      const response3 = await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterInvalidAttempt - afterFirst).toBe(0);
      expect(afterSecond - afterInvalidAttempt).toBe(0);
      expect(invalidKeyResponse.status).toBe(401);
      expect(response1.body).toEqual(response3.body);
    });

    it('template version changes invalidate cache', async () => {
      const suffix = `tmpl-v-${Date.now()}`;
      const payload1 = buildTextPayload(suffix, {
        template: 'Template v1',
      });
      const payload2 = buildTextPayload(suffix, {
        template: 'Template v2', // Different template version
      });

      const beforeCount = countLlmDispatches(logFilePath);

      // First request with template v1: cache miss
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload1)
        .expect(201);

      await delay(200);
      const afterFirst = countLlmDispatches(logFilePath);

      // Second request with template v1 again: cache hit
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload1)
        .expect(201);

      await delay(200);
      const afterSecond = countLlmDispatches(logFilePath);

      // Third request with template v2: cache miss (new template version)
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payload2)
        .expect(201);

      await delay(200);
      const afterThird = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(afterThird - afterSecond).toBe(1);
    });

    it('file-based image content changes invalidate cache', async () => {
      const imagePath = path.join(__dirname, 'logs', 'temp-image-test.png');
      const suffix = `img-content-${Date.now()}`;

      try {
        // Write initial image content and cache it
        fs.writeFileSync(imagePath, 'initial-image-content');
        const payload1 = buildTextPayload(suffix, {
          images: JSON.stringify([{ path: imagePath, mimeType: 'image/png' }]),
        });

        const beforeCount = countLlmDispatches(logFilePath);

        // First request: cache miss
        await request(app.appUrl)
          .post('/v1/assessor')
          .set('Authorization', `Bearer ${app.apiKey}`)
          .send(payload1)
          .expect(201);

        await delay(200);
        const afterFirst = countLlmDispatches(logFilePath);

        // Second request with same image: cache hit
        await request(app.appUrl)
          .post('/v1/assessor')
          .set('Authorization', `Bearer ${app.apiKey}`)
          .send(payload1)
          .expect(201);

        await delay(200);
        const afterSecond = countLlmDispatches(logFilePath);

        // Modify the image file on disk
        fs.writeFileSync(imagePath, 'modified-image-content');

        // Third request with modified image content: cache miss
        await request(app.appUrl)
          .post('/v1/assessor')
          .set('Authorization', `Bearer ${app.apiKey}`)
          .send(payload1)
          .expect(201);

        await delay(200);
        const afterThird = countLlmDispatches(logFilePath);

        expect(afterFirst - beforeCount).toBe(1);
        expect(afterSecond - afterFirst).toBe(0);
        expect(afterThird - afterSecond).toBe(1);
      } finally {
        // Clean up temporary image file
        try {
          fs.unlinkSync(imagePath);
        } catch {
          // File may not exist, that's OK
        }
      }
    });

    it('eviction race: immediately requesting evicted entry triggers recomputation', async () => {
      // With a small cache (512 KiB), we can force eviction and then immediately request the evicted entry
      // Use buildLargePayload which creates ~400 KiB payloads
      const suffixA = `evict-race-a-${Date.now()}`;
      const suffixB = `evict-race-b-${Date.now()}`;

      const payloadA = CacheE2ETestHelper.buildLargePayload(suffixA);
      const payloadB = CacheE2ETestHelper.buildLargePayload(suffixB);

      const beforeCount = countLlmDispatches(logFilePath);

      // First request: cache miss
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

      // Third request with a different large payload: likely triggers eviction of payloadA
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadB)
        .expect(201);

      await delay(200);
      const afterThird = countLlmDispatches(logFilePath);

      // Immediately request the original payload again (evicted entry)
      // This should be a cache miss because it was evicted
      await request(app.appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${app.apiKey}`)
        .send(payloadA)
        .expect(201);

      await delay(200);
      const afterFourth = countLlmDispatches(logFilePath);

      expect(afterFirst - beforeCount).toBe(1);
      expect(afterSecond - afterFirst).toBe(0);
      expect(afterThird - afterSecond).toBe(1);
      // The evicted entry should be recomputed
      expect(afterFourth - afterThird).toBe(1);
    });
  });
});
