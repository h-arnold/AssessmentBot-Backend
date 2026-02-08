import { LRUCache } from 'lru-cache';

export const ASSESSOR_CACHE = Symbol('ASSESSOR_CACHE');

const sizeOverrideKey = Symbol('sizeOverride');
const valueOverrideKey = Symbol('valueOverride');

type CacheValue = Record<string, unknown> | string | number | boolean;

type WrappedCacheValue = Record<string, unknown> & {
  [sizeOverrideKey]?: number;
  [valueOverrideKey]?: unknown;
};

/**
 * In-memory cache for assessor responses backed by an LRU eviction strategy.
 * Supports size-based eviction (in bytes) and TTL-based expiry.
 */
export class AssessorCacheStore {
  private readonly cache: LRUCache<string, CacheValue>;
  private readonly expiryTimes = new Map<string, number>();
  private readonly defaultTtlMs: number;

  constructor(maxSizeBytes: number, defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs;
    const sizeCalculation = (value: unknown): number => {
      if (
        value &&
        typeof value === 'object' &&
        sizeOverrideKey in (value as WrappedCacheValue)
      ) {
        const overrideValue = (value as WrappedCacheValue)[sizeOverrideKey];
        if (typeof overrideValue === 'number') {
          return overrideValue;
        }
      }

      if (typeof value === 'string') {
        return Buffer.byteLength(value, 'utf8');
      }
      try {
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
      } catch {
        return 1024;
      }
    };

    const cacheOptions: LRUCache.Options<string, CacheValue, unknown> = {
      maxSize: maxSizeBytes,
      ttl: defaultTtlMs,
      ttlAutopurge: true,
      allowStale: false,
      sizeCalculation,
      dispose: (_value: CacheValue, key: string): void => {
        this.expiryTimes.delete(key);
      },
    };
    const legacyOptions = {
      max: maxSizeBytes,
      maxAge: defaultTtlMs,
      length: sizeCalculation,
      stale: false,
    };

    this.cache = new LRUCache<string, CacheValue>({
      ...cacheOptions,
      ...legacyOptions,
    } as unknown as LRUCache.Options<string, CacheValue, unknown>);
  }

  get<T>(key: string): T | undefined {
    const cachedValue = this.cache.get(key) as CacheValue | undefined;
    if (!cachedValue) {
      this.expiryTimes.delete(key);
      return undefined;
    }

    if (
      typeof cachedValue === 'object' &&
      cachedValue !== null &&
      valueOverrideKey in (cachedValue as WrappedCacheValue)
    ) {
      return (cachedValue as WrappedCacheValue)[valueOverrideKey] as
        | T
        | undefined;
    }

    return cachedValue as T;
  }

  /**
   * Returns the remaining TTL in milliseconds for a cache entry.
   * Useful for diagnostics and debugging.
   */
  getRemainingTtl(key: string): number {
    const cacheWithTtl = this.cache as unknown as {
      getRemainingTTL?: (entryKey: string) => number;
    };

    if (typeof cacheWithTtl.getRemainingTTL === 'function') {
      return cacheWithTtl.getRemainingTTL(key);
    }

    const expiryTime = this.expiryTimes.get(key);
    if (!expiryTime) {
      return 0;
    }
    return Math.max(0, expiryTime - Date.now());
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
    const shouldOverrideSize = typeof size === 'number' && size > 0;
    const isLegacyCache =
      'maxAge' in (this.cache as unknown as Record<string, unknown>) &&
      !(
        'getRemainingTTL' in (this.cache as unknown as Record<string, unknown>)
      );
    const legacyCache = this.cache as unknown as {
      set: (entryKey: string, entryValue: CacheValue, maxAge?: number) => void;
    };

    if (isLegacyCache && shouldOverrideSize) {
      const wrappedValue: WrappedCacheValue = {
        [sizeOverrideKey]: size,
        [valueOverrideKey]: value,
      };
      legacyCache.set(key, wrappedValue as CacheValue, this.defaultTtlMs);
    } else if (isLegacyCache) {
      legacyCache.set(key, value as CacheValue, this.defaultTtlMs);
    } else {
      const options =
        typeof size === 'number' && size > 0 ? { size } : undefined;
      this.cache.set(key, value as CacheValue, options);
    }

    this.expiryTimes.set(key, Date.now() + this.defaultTtlMs);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    const cacheWithClear = this.cache as unknown as {
      clear?: () => void;
      reset?: () => void;
    };

    if (typeof cacheWithClear.clear === 'function') {
      cacheWithClear.clear();
    } else if (typeof cacheWithClear.reset === 'function') {
      cacheWithClear.reset();
    }
    this.expiryTimes.clear();
  }
}
