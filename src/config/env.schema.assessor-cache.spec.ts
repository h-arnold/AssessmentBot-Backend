import { configSchema } from './env.schema';
import {
  resolveAssessorCacheMaxSizeBytes,
  resolveAssessorCacheTtlSeconds,
} from '../common/cache/assessor-cache.config';

const buildBaseEnv = (): Record<string, string> => ({
  NODE_ENV: 'test',
  PORT: '3000',
  APP_NAME: 'AssessmentBot-Backend',
  GEMINI_API_KEY: 'test-key',
});

describe('configSchema assessor cache validation', () => {
  it('defaults TTL minutes to 1440 when unset', () => {
    const parsed = configSchema.parse({
      ...buildBaseEnv(),
      ASSESSOR_CACHE_HASH_SECRET: 'secret',
    }) as Record<string, unknown>;

    expect(parsed.ASSESSOR_CACHE_TTL_MINUTES).toBe(1440);
  });

  it('defaults max size to 384 MiB when unset', () => {
    const parsed = configSchema.parse({
      ...buildBaseEnv(),
      ASSESSOR_CACHE_HASH_SECRET: 'secret',
    }) as Record<string, unknown>;

    expect(parsed.ASSESSOR_CACHE_MAX_SIZE_MIB).toBe(384);
  });

  it('requires a non-empty hash secret', () => {
    expect(() =>
      configSchema.parse({
        ...buildBaseEnv(),
      }),
    ).toThrow();
  });

  it('rejects zero or negative TTL minutes', () => {
    expect(() =>
      configSchema.parse({
        ...buildBaseEnv(),
        ASSESSOR_CACHE_HASH_SECRET: 'secret',
        ASSESSOR_CACHE_TTL_MINUTES: '0',
      }),
    ).toThrow();

    expect(() =>
      configSchema.parse({
        ...buildBaseEnv(),
        ASSESSOR_CACHE_HASH_SECRET: 'secret',
        ASSESSOR_CACHE_TTL_MINUTES: '-5',
      }),
    ).toThrow();
  });

  it('rejects TTL minutes above 2880', () => {
    expect(() =>
      configSchema.parse({
        ...buildBaseEnv(),
        ASSESSOR_CACHE_HASH_SECRET: 'secret',
        ASSESSOR_CACHE_TTL_MINUTES: '2881',
      }),
    ).toThrow();
  });

  it('rejects TTL hours above 48', () => {
    expect(() =>
      configSchema.parse({
        ...buildBaseEnv(),
        ASSESSOR_CACHE_HASH_SECRET: 'secret',
        ASSESSOR_CACHE_TTL_HOURS: '49',
      }),
    ).toThrow();
  });

  it('rejects non-positive cache max size', () => {
    expect(() =>
      configSchema.parse({
        ...buildBaseEnv(),
        ASSESSOR_CACHE_HASH_SECRET: 'secret',
        ASSESSOR_CACHE_MAX_SIZE_MIB: '0',
      }),
    ).toThrow();
  });

  it('prefers TTL hours over minutes when both are set', () => {
    const parsed = configSchema.parse({
      ...buildBaseEnv(),
      ASSESSOR_CACHE_HASH_SECRET: 'secret',
      ASSESSOR_CACHE_TTL_MINUTES: '30',
      ASSESSOR_CACHE_TTL_HOURS: '2',
    }) as Record<string, unknown>;

    expect(resolveAssessorCacheTtlSeconds(parsed)).toBe(7200);
  });

  it('accepts hours when minutes are invalid', () => {
    const result = configSchema.safeParse({
      ...buildBaseEnv(),
      ASSESSOR_CACHE_HASH_SECRET: 'secret',
      ASSESSOR_CACHE_TTL_MINUTES: '0',
      ASSESSOR_CACHE_TTL_HOURS: '1',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      resolveAssessorCacheTtlSeconds(result.data as Record<string, unknown>),
    ).toBe(3600);
  });

  it('converts minutes to seconds when hours are unset', () => {
    const parsed = configSchema.parse({
      ...buildBaseEnv(),
      ASSESSOR_CACHE_HASH_SECRET: 'secret',
      ASSESSOR_CACHE_TTL_MINUTES: '30',
    }) as Record<string, unknown>;

    expect(resolveAssessorCacheTtlSeconds(parsed)).toBe(1800);
  });

  it('converts max size MiB into bytes', () => {
    const parsed = configSchema.parse({
      ...buildBaseEnv(),
      ASSESSOR_CACHE_HASH_SECRET: 'secret',
      ASSESSOR_CACHE_MAX_SIZE_MIB: '2',
    }) as Record<string, unknown>;

    expect(resolveAssessorCacheMaxSizeBytes(parsed)).toBe(2 * 1024 * 1024);
  });
});
