import { LRUCache } from 'lru-cache';

export const ASSESSOR_CACHE = Symbol('ASSESSOR_CACHE');

type CacheValue = {};

/**
 * In-memory cache for assessor responses backed by an LRU eviction strategy.
 * Supports size-based eviction (in bytes) and TTL-based expiry.
 */
export class AssessorCacheStore {
  private readonly cache: LRUCache<string, CacheValue>;

  constructor(maxSizeBytes: number, defaultTtlMs: number) {
    this.cache = new LRUCache<string, CacheValue>({
      maxSize: maxSizeBytes,
      ttl: defaultTtlMs,
      ttlAutopurge: true,
      allowStale: false,
      sizeCalculation: (value: unknown): number => {
        if (typeof value === 'string') {
          return Buffer.byteLength(value, 'utf8');
        }
        try {
          return Buffer.byteLength(JSON.stringify(value), 'utf8');
        } catch {
          return 1024;
        }
      },
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  /**
   * Stores a value in the cache.
   * @param key Cache key
   * @param value Value to cache
   * @param size Optional explicit byte size for eviction calculation.
   *             When provided, overrides the default sizeCalculation.
   *             Use this to reflect the true cost of caching (e.g., request payload size).
   */
  set(key: string, value: unknown, size?: number): void {
    const options = typeof size === 'number' && size > 0 ? { size } : undefined;
    this.cache.set(key, value as CacheValue, options);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
