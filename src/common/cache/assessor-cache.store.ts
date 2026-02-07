import { type KeyvStoreAdapter } from 'keyv';
import { LRUCache } from 'lru-cache';

 
type CacheValue = {};

/**
 * A KeyvStoreAdapter-compatible in-memory store backed by lru-cache.
 * Supports size-based eviction (maxSize in bytes) and TTL-based expiry.
 */
export class AssessorLruStore implements Omit<KeyvStoreAdapter, 'on'> {
  opts: Record<string, unknown> = {};
  namespace?: string;

  private readonly cache: LRUCache<string, CacheValue>;

  constructor(maxSizeBytes: number, defaultTtlMs: number) {
    this.cache = new LRUCache<string, CacheValue>({
      maxSize: maxSizeBytes,
      ttl: defaultTtlMs,
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

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key) as T | undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const options = typeof ttl === 'number' && ttl > 0 ? { ttl } : undefined;
    this.cache.set(key, value as CacheValue, options);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
}
