type AssessorCacheConfig = {
  ASSESSOR_CACHE_TTL_HOURS?: number;
  ASSESSOR_CACHE_TTL_MINUTES: number;
  ASSESSOR_CACHE_MAX_SIZE_MIB: number;
};

export const resolveAssessorCacheTtlSeconds = (
  config: Pick<
    AssessorCacheConfig,
    'ASSESSOR_CACHE_TTL_HOURS' | 'ASSESSOR_CACHE_TTL_MINUTES'
  >,
): number => {
  if (
    typeof config.ASSESSOR_CACHE_TTL_HOURS === 'number' &&
    config.ASSESSOR_CACHE_TTL_HOURS > 0
  ) {
    return config.ASSESSOR_CACHE_TTL_HOURS * 60 * 60;
  }

  return config.ASSESSOR_CACHE_TTL_MINUTES * 60;
};

export const resolveAssessorCacheMaxSizeBytes = (
  config: Pick<AssessorCacheConfig, 'ASSESSOR_CACHE_MAX_SIZE_MIB'>,
): number => config.ASSESSOR_CACHE_MAX_SIZE_MIB * 1024 * 1024;
