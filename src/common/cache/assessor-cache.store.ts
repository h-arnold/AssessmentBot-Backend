import { EventEmitter } from 'node:events';

import type { KeyvStoreAdapter, StoredData } from 'keyv';
import { LRUCache } from 'lru-cache';

export interface AssessorCacheStoreOptions {
  ttlMs: number;
  maxSizeBytes: number;
}

const calculateEntrySize = (value: unknown): number => {
  if (
    value !== null &&
    typeof value === 'object' &&
    '__cacheSizeHint' in value
  ) {
    const hint = (value as { __cacheSizeHint?: number }).__cacheSizeHint;
    if (typeof hint === 'number' && hint > 0) {
      return hint;
    }
  }

  if (Buffer.isBuffer(value)) {
    return value.length;
  }

  if (typeof value === 'string') {
    return Buffer.byteLength(value);
  }

  try {
    return Buffer.byteLength(JSON.stringify(value));
  } catch {
    return 0;
  }
};

type CacheValue = NonNullable<StoredData<unknown>>;

export class AssessorCacheStore
  extends EventEmitter
  implements KeyvStoreAdapter
{
  readonly opts: AssessorCacheStoreOptions;
  namespace?: string;
  private readonly cache: LRUCache<string, CacheValue>;

  constructor(options: AssessorCacheStoreOptions) {
    super();
    this.opts = options;
    this.cache = new LRUCache<string, CacheValue>({
      maxSize: options.maxSizeBytes,
      ttl: options.ttlMs,
      sizeCalculation: calculateEntrySize,
    });
  }

  async get<T>(key: string): Promise<StoredData<T> | undefined> {
    return this.cache.get(key) as StoredData<T> | undefined;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    const ttlMs = typeof ttl === 'number' ? ttl : undefined;
    this.cache.set(key, value as CacheValue, { ttl: ttlMs });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export const createAssessorCacheStore = (
  options: AssessorCacheStoreOptions,
): AssessorCacheStore => new AssessorCacheStore(options);
