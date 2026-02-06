# Action Plan: Assessor Response Caching (TDD First)

## External Documentation Check

I could not access the NestJS caching documentation via `curl` (403), so I have used the content you provided from the NestJS docs. The plan below aligns with those details and repository standards.

## TDD First: Test Cases (Write These Before Implementation)

### 1) Cache Module Registration

- **Should register an in-memory cache store**
  - Confirm `CacheModule` is registered globally or within the assessor module.
- **Should use a 24-hour default TTL**
  - Ensure the default TTL is `86,400,000` milliseconds (or `@CacheTTL(60 * 60 * 24 * 1000)` on the route).
- **Should allow route-level TTL override**
  - Validate that route-level `@CacheTTL` overrides any global default when set.

### 2) Assessor Cache Key Utility

- **Should generate a deterministic cache key for identical DTOs**
  - Given the same `CreateAssessorDto`, the utility returns the same key every time.
- **Should generate different keys for different DTOs**
  - Changing any field (including `studentResponse`) produces a different key.
- **Should be stable across key ordering**
  - When the DTO is serialised with a stable stringifier, re-ordering object keys yields the same cache key.
- **Should handle IMAGE task buffers correctly**
  - Buffers are normalised (e.g., base64) before hashing and produce deterministic keys.
- **Should use a secret HMAC**
  - If the secret changes, the resulting key changes.
- **Should avoid plaintext data in the cache key**
  - Assert that the key contains no raw DTO values (regex checks for raw text snippets).

### 3) Assessor Cache Interceptor

- **Should allow caching on POST /v1/assessor**
  - Ensure `isRequestCacheable` permits `POST` for the assessor route.
- **Should use hashed DTO-based cache keys**
  - `trackBy` should call the cache key utility and never include raw DTO values.
- **Should bypass caching when body is missing**
  - If the request body is undefined or invalid, the interceptor should skip caching (return `undefined` from `trackBy`).
- **Should respect structured clone constraints**
  - Ensure the cached response payload uses types supported by the structured clone algorithm.
- **Should emit cache hit/miss logs**
  - Verify structured log entries for both hits and misses with the cache key hash (no raw DTO data).

### 4) Controller Wiring / Integration

- **Should cache assessor responses for identical DTOs**
  - Two identical requests should return the cached response on the second call.
- **Should not cache across different DTOs**
  - Different inputs should result in different cache keys and different responses.
- **Should set a 24-hour TTL**
  - Validate that the configured TTL is 86,400,000 milliseconds at the route or cache module level.
- **Should never cache unauthorised requests**
  - Requests rejected by `ApiKeyGuard` should not be cached.
- **Should not cache when native response is injected**
  - Verify no use of `@Res()` in cached endpoints, as this disables cache interceptor support.

## Detailed Specification

### Functional Behaviour

1. **Cache scope**
   - Cache responses only for `POST /v1/assessor`.
   - Cache entries are scoped solely by the hashed DTO content (no API key, no headers).

2. **Cache key derivation**
   - Generate cache keys from a stable serialisation of `CreateAssessorDto`.
   - Use HMAC-SHA256 with a secret (`CACHE_KEY_SECRET`) to avoid reversible hashes.
   - Normalise IMAGE task buffers to base64 before serialisation.
   - Prefix keys with `assessor:` to simplify log filtering.

3. **TTL behaviour**
   - Default TTL is 24 hours (86,400,000 milliseconds).
   - Route-level `@CacheTTL` should explicitly set 24 hours to make intent clear.

4. **Logging**
   - Log cache hits and misses with a structured payload:
     - `event`: `assessor.cache.hit` | `assessor.cache.miss`
     - `cacheKeyHash`: the generated hash (no raw DTO data)
     - `ttlMilliseconds`: 86,400,000
     - `cacheable`: `true` | `false` (for cases where caching is skipped)
   - Ensure log entries follow existing Pino JSON logging conventions.

### Acceptance Requirements

- **Privacy**: Cache keys must not include raw student data.
- **Correctness**: Identical DTOs must result in cache hits; differing DTOs must not.
- **Performance**: Cache key generation must be deterministic and fast (no heavy parsing).
- **Observability**: Cache hits, misses, and skips must be logged for aggregation.
- **Security**: Cache key hashing must use a secret HMAC.

### Constraints

- Use in-memory cache storage only (no Redis or external stores).
- Only cache assessor responses, not other routes.
- Do not cache requests that fail authentication or validation.
- Ensure cached payloads are structured-clone safe.
- Maintain British English in code, comments, and commit messages.

### Error Types

No new error types are required. Cache failures should fall back to a cache miss and log a warning without exposing request data.

## Implementation Tasks (After Tests)

1. **Introduce a cache key utility**
   - Create `src/common/utils/assessor-cache-key.util.ts`.
   - Use stable serialisation and HMAC-SHA256 with a `CACHE_KEY_SECRET` from `ConfigService`.
   - Normalise IMAGE task buffers to base64 before hashing.

2. **Add a custom assessor cache interceptor**
   - Create `src/v1/assessor/assessor-cache.interceptor.ts` extending `CacheInterceptor`.
   - Override `isRequestCacheable` to allow `POST` for `/v1/assessor`.
   - Override `trackBy` to return `assessor:<digest>` from the cache key utility.
   - Emit cache hit/miss logs with the hashed cache key.

3. **Wire caching into the assessor endpoint**
   - Apply `@UseInterceptors(AssessorCacheInterceptor)` to `AssessorController.create`.
   - Set `@CacheTTL(60 * 60 * 24 * 1000)` for 24-hour TTL (milliseconds).

4. **Register in-memory cache**
   - Add `CacheModule.register` in `AppModule` (global) or `AssessorModule` (scoped).
   - Ensure the default TTL is 86,400,000 milliseconds if set globally.

5. **Update configuration docs if needed**
   - Add `CACHE_KEY_SECRET` to the configuration guide and any environment templates.

## Notes on Alignment With Repository Standards

- Follow British English conventions in all code, tests, and commit messages.
- Use explicit return types for new functions and avoid `any`.
- Use Jest/NestJS testing conventions from `docs/testing/README.md` and the code style guidance in `docs/development/code-style.md`.
