export interface AssessorCacheConfig {
  ASSESSOR_CACHE_TTL_HOURS?: number;
  ASSESSOR_CACHE_TTL_MINUTES?: number;
  ASSESSOR_CACHE_MAX_SIZE_MIB?: number;
}

export const resolveAssessorCacheTtlSeconds = (
  config: AssessorCacheConfig,
): number => {
  const hours = config.ASSESSOR_CACHE_TTL_HOURS;
  if (typeof hours === 'number') {
    return hours * 60 * 60;
  }

  const minutes = config.ASSESSOR_CACHE_TTL_MINUTES ?? 1440;
  return minutes * 60;
};

export const resolveAssessorCacheMaxSizeBytes = (
  config: AssessorCacheConfig,
): number => {
  const sizeMib = config.ASSESSOR_CACHE_MAX_SIZE_MIB ?? 384;
  return sizeMib * 1024 * 1024;
};
