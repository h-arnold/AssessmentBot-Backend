import { AssessorCacheStore } from './assessor-cache.store';

const ONE_MIB = 1024 * 1024;
const ONE_MINUTE_MS = 60_000;

describe('AssessorCacheStore', () => {
  let store: AssessorCacheStore;

  beforeEach(() => {
    store = new AssessorCacheStore(ONE_MIB, ONE_MINUTE_MS);
  });

  // --- get / set basic operations ---

  it('stores and retrieves a value', () => {
    store.set('key1', { foo: 'bar' });
    expect(store.get('key1')).toEqual({ foo: 'bar' });
  });

  it('stores and retrieves a string value', () => {
    store.set('s', 'hello');
    expect(store.get<string>('s')).toBe('hello');
  });

  // --- returns undefined for missing keys ---

  it('returns undefined for keys not in the cache', () => {
    expect(store.get('nonexistent')).toBeUndefined();
  });

  // --- has() ---

  it('returns true for a stored key', () => {
    store.set('present', 42);
    expect(store.has('present')).toBe(true);
  });

  it('returns false for a missing key', () => {
    expect(store.has('absent')).toBe(false);
  });

  // --- clear() ---

  it('empties the cache when clear() is called', () => {
    store.set('a', 1);
    store.set('b', 2);
    store.clear();

    expect(store.has('a')).toBe(false);
    expect(store.has('b')).toBe(false);
    expect(store.get('a')).toBeUndefined();
  });

  // --- size-based eviction ---

  it('evicts the oldest entries when maxSizeBytes is exceeded', () => {
    // Allow only ~200 bytes so that a few entries will cause eviction
    const smallStore = new AssessorCacheStore(200, ONE_MINUTE_MS);
    const largeValue = 'x'.repeat(100); // ~100 bytes

    smallStore.set('first', largeValue);
    smallStore.set('second', largeValue);
    // Third entry should push the first one out
    smallStore.set('third', largeValue);

    expect(smallStore.has('first')).toBe(false);
    expect(smallStore.has('third')).toBe(true);
  });

  // --- explicit size parameter overrides sizeCalculation ---

  it('uses the explicit size parameter for eviction accounting', () => {
    // 200-byte budget; declare each tiny value as 100 bytes
    const smallStore = new AssessorCacheStore(200, ONE_MINUTE_MS);

    smallStore.set('a', 'tiny', 100);
    smallStore.set('b', 'tiny', 100);
    // This should evict 'a' because budget is only 200 bytes
    smallStore.set('c', 'tiny', 100);

    expect(smallStore.has('a')).toBe(false);
    expect(smallStore.has('c')).toBe(true);
  });

  // --- TTL expiry ---

  it('expires entries after the configured TTL', async () => {
    const shortTtlStore = new AssessorCacheStore(ONE_MIB, 50);
    shortTtlStore.set('ephemeral', 'gone soon');

    expect(shortTtlStore.get('ephemeral')).toBe('gone soon');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(shortTtlStore.get('ephemeral')).toBeUndefined();
    expect(shortTtlStore.has('ephemeral')).toBe(false);
  });

  // --- LRU order ---

  it('evicts the least recently used entry first', () => {
    // Budget for roughly two entries (~100 bytes each)
    const lruStore = new AssessorCacheStore(200, ONE_MINUTE_MS);
    const value = 'x'.repeat(100);

    lruStore.set('old', value);
    lruStore.set('mid', value);

    // Access 'old' so it becomes recently used
    lruStore.get('old');

    // Adding a new entry should evict 'mid' (least recently used), not 'old'
    lruStore.set('new', value);

    expect(lruStore.has('mid')).toBe(false);
    expect(lruStore.has('old')).toBe(true);
    expect(lruStore.has('new')).toBe(true);
  });
});
