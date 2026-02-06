type CacheConfigModule = {
  resolveAssessorCacheTtlSeconds: (config: {
    ASSESSOR_CACHE_TTL_HOURS?: number;
    ASSESSOR_CACHE_TTL_MINUTES: number;
  }) => number;
};

const loadCacheConfig = (): CacheConfigModule => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./assessor-cache.config') as CacheConfigModule;
  } catch (err) {
    throw new Error(
      `Expected cache config helper at src/common/cache/assessor-cache.config.ts. ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
};

describe('resolveAssessorCacheTtlSeconds', () => {
  it('uses minutes when hours are not set', () => {
    const { resolveAssessorCacheTtlSeconds } = loadCacheConfig();
    const ttlSeconds = resolveAssessorCacheTtlSeconds({
      ASSESSOR_CACHE_TTL_MINUTES: 30,
    });
    expect(ttlSeconds).toBe(1800);
  });

  it('prioritises hours when both hours and minutes are set', () => {
    const { resolveAssessorCacheTtlSeconds } = loadCacheConfig();
    const ttlSeconds = resolveAssessorCacheTtlSeconds({
      ASSESSOR_CACHE_TTL_HOURS: 2,
      ASSESSOR_CACHE_TTL_MINUTES: 30,
    });
    expect(ttlSeconds).toBe(7200);
  });

  it('supports the maximum 48-hour TTL', () => {
    const { resolveAssessorCacheTtlSeconds } = loadCacheConfig();
    const ttlSeconds = resolveAssessorCacheTtlSeconds({
      ASSESSOR_CACHE_TTL_HOURS: 48,
      ASSESSOR_CACHE_TTL_MINUTES: 10,
    });
    expect(ttlSeconds).toBe(172800);
  });
});
