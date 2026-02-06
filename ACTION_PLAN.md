# Action Plan: Privacy-Preserving In-Memory Caching for Assessor Responses

## 1. Objective

Introduce an in-memory cache for assessor responses that:

- uses a privacy-preserving cache key derived from a **hashed** `CreateAssessorDto`,
- applies a **default TTL of 24 hours**, configurable via environment variables,
- incorporates a **secret** (from environment variables) into the hash to strengthen privacy and prevent key enumeration,
- respects the project’s statelessness and security requirements.

This plan is written to follow the repo’s TDD workflow and British English standards.

---

## 2. Key Requirements

### Functional

1. **Cache responses for assessor requests** using a key derived from the request DTO.
2. **Cache key must not contain raw student data**. It must be a hash of the DTO.
3. **Cache TTL defaults to 24 hours** (86,400 seconds) but is configurable via environment variable.
4. **Hash must include a secret** (environment-configured) to mitigate preimage and enumeration attacks.
5. **Caching must be in-memory** (no persistent storage).

### Non-Functional

1. **Security-first**: never store raw student data in cache keys or logs.
2. **Type safety**: all new config is validated by Zod and typed via `ConfigService`.
3. **Statelessness**: cache remains in-memory and per-instance; no shared state across nodes.
4. **Maintainability**: follow NestJS modular patterns and existing logging practices.

---

## 3. Constraints and Assumptions

1. **Stateless design**: in-memory cache is per-instance only and is cleared on restart. This is acceptable because statelessness forbids durable storage, but it does mean cache hits are not shared across replicas.
2. **Data privacy**: only the hash of a canonicalised DTO is used as the key; no raw payload should be stored or logged.
3. **Config validation**: any new environment variable must be added to `src/config/env.schema.ts` and documented in `docs/configuration/environment.md`, `.env.example`, and `.test.env.example` (the source of our test defaults).
4. **No quality gate overrides**: lint, British English, and other quality gates must remain intact.
5. **TTL unit**: expose TTL as a human-friendly value (minutes or hours) and convert to **seconds** internally. Enforce a strict **maximum TTL of 48 hours** and disallow zero/negative values.
6. **Dependencies**: NestJS cache support is not currently in the repo and requires adding `@nestjs/cache-manager` and `cache-manager` before wiring `CacheModule` or `CacheInterceptor`.
7. **Decorator constraints**: configuration cannot be injected into decorators at runtime. Avoid `@CacheTTL()` unless a compile-time config pattern is introduced (similar to `throttler.config.ts`).
8. **Size-based eviction**: the default in-memory store does **not** support byte-based limits; implement a custom cache store or cache backend that supports size-based eviction.

---

## 4. Proposed Configuration Additions

### New Environment Variables

- `ASSESSOR_CACHE_TTL_MINUTES` (default: `1440` / 24 hours)
- `ASSESSOR_CACHE_TTL_HOURS` (optional alternative to minutes; if set, it takes precedence)
- `ASSESSOR_CACHE_HASH_SECRET` (required, non-empty)
- `ASSESSOR_CACHE_MAX_SIZE_MIB` (default: `384`)

### Validation

- `ASSESSOR_CACHE_TTL_MINUTES`: `z.coerce.number().int().min(1).max(2880).default(1440)`
- `ASSESSOR_CACHE_TTL_HOURS`: `z.coerce.number().int().min(1).max(48).optional()`
- `ASSESSOR_CACHE_HASH_SECRET`: `z.string().min(1)`
- `ASSESSOR_CACHE_MAX_SIZE_MIB`: `z.coerce.number().int().min(1).default(384)`

---

## 5. Design Overview

### 5.1 Cache Strategy

Use NestJS caching with an **explicit interceptor** for assessor requests to allow caching of `POST /v1/assessor` (since automatic caching only handles GET by default). The interceptor will:

- permit cache for the assessor endpoint,
- hash the DTO using **HMAC-SHA256** (required for security) with `ASSESSOR_CACHE_HASH_SECRET`,
- create a stable cache key using a **canonical JSON representation** of the DTO (sorted keys and normalised Buffer values).

### 5.2 Canonicalisation Details

- Use a deterministic serialisation function that sorts object keys recursively.
- For binary/image content, convert `Buffer` values to base64 strings before hashing; when the DTO contains a data URI string (e.g., `data:image/png;base64,...`), extract and hash only the base64 portion after `base64,` so identical binary inputs (Buffer vs data URI) canonicalise identically.
- Ensure no raw request data is logged.

### 5.3 TTL Application

- Cache module default TTL is computed from `ASSESSOR_CACHE_TTL_HOURS` or `ASSESSOR_CACHE_TTL_MINUTES`, converted to **seconds** (and clamped to 48 hours).
- Avoid `@CacheTTL()` unless a compile-time config pattern is introduced; prefer module-level TTL configuration.

### 5.4 Cache Key Scope

- **Decision**: keep caching global (shared across API keys) to maximise cache hits and reduce LLM load.
- **Rationale**: global caching is acceptable for identical assessment payloads because no user-identifying data is included in cache keys and responses are already derived from the payload.
- **Guardrail**: if future requirements demand tenant isolation, include a hashed API key identifier (HMAC with the same secret) in the cache key prefix.

### 5.5 Eviction and Memory Growth

- The default in-memory store does **not** support byte-based limits. To achieve size-based eviction **and** TTL:
  - Implement a **custom cache store** backed by an LRU cache that supports `maxSize` in bytes (for example, using an `lru-cache` instance with `maxSize` and `sizeCalculation`), and wire it through `cache-manager`.
  - Configure the store with:
    - `ttl` computed from `ASSESSOR_CACHE_TTL_HOURS` / `ASSESSOR_CACHE_TTL_MINUTES` (in **seconds**),
    - `maxSize` from `ASSESSOR_CACHE_MAX_SIZE_MIB` (converted to bytes),
    - a `sizeCalculation` function that returns an estimated byte size.
  - This preserves caching for IMAGE tasks and large payloads while ensuring eviction occurs when the cache exceeds 384 MiB by default and entries expire by TTL.
  - **Size calculation strategy**: measure only the cached response value when calculating byte size—use `Buffer.byteLength(JSON.stringify(value), 'utf8')` for objects and `Buffer.byteLength` for strings/buffers so that metadata and persisted hashes count toward `maxSize` but raw image bytes (which are never cached) are excluded.

### 5.6 Risk Mitigations and Compatibility Checks

- **Store compatibility**: confirm the chosen `cache-manager` major version and custom store interface are compatible with `@nestjs/cache-manager` before implementation.
- **TTL = 0 semantics**: explicitly reject `ttl = 0` in configuration validation to prevent unbounded retention (privacy requirement).
- **Size calculation strategy**: define a consistent byte sizing approach (for example, serialised JSON byte length for objects and `Buffer.byteLength` for strings/buffers) to avoid under/over-eviction.
- **Template/version drift**: decide whether to include prompt template content or version hash in the cache key to avoid stale responses after template edits.
- **Image file content**: for the `images` array in `CreateAssessorDto`, **always** include file content hashes in the cache key. File-based requests are the most expensive and must remain cacheable, so content hashing (not path or mtime) is mandatory.
- **Response purity**: confirm cached responses are purely derived from the DTO (no API key or request-context variation) to justify global caching.
- **Observability**: add lightweight metrics or logging (without sensitive data) to track cache hit rate and eviction counts.

---

## 6. Exhaustive Test Plan (TDD)

### 6.1 Unit Tests

#### A. Cache Key Generation Utility/Interceptor

1. **Stable hash for identical DTOs**
   - Given identical DTOs, cache key must match.
2. **Different hash for different DTOs**
   - Change a single field (e.g., `studentResponse`) → hash changes.
3. **Hash does not contain raw data**
   - Ensure the cache key does not include raw strings from the DTO.
4. **Buffer normalisation**
   - DTO containing `Buffer` values should be canonicalised to base64 consistently.
5. **Key order independence**
   - Same DTO with reordered keys should hash identically.
6. **Secret-dependent hash**
   - Same DTO with a different `ASSESSOR_CACHE_HASH_SECRET` should produce a different hash.
7. **Prompt template drift**
   - If template versions are included in the key, updating templates must invalidate the cache.
8. **File-based images**
   - When file-based images are provided via the `images` field, verify the cache key includes those files' content hashes (not just paths or mtimes) so expensive requests remain cacheable yet invalidated when contents change.

#### B. Config Schema

1. **Defaults**
   - When `ASSESSOR_CACHE_TTL_MINUTES` is not set, it defaults to `1440` (24 hours).
   - When `ASSESSOR_CACHE_MAX_SIZE_MIB` is not set, it defaults to `384`.
2. **Validation failures**
   - Missing `ASSESSOR_CACHE_HASH_SECRET` should fail validation.
   - Zero/negative TTL should fail validation.
   - TTL above 48 hours should fail validation.
   - `ASSESSOR_CACHE_TTL_MINUTES` above `2880` should fail validation.
   - `ASSESSOR_CACHE_TTL_HOURS` above `48` should fail validation.
   - Non-positive max size should fail validation.
3. **Precedence and conversion**
   - When both `ASSESSOR_CACHE_TTL_HOURS` and `ASSESSOR_CACHE_TTL_MINUTES` are set, hours must take precedence.
   - If hours is valid and minutes is invalid, configuration should still succeed using hours (and vice versa for minutes when hours is unset).
   - Verify conversion to seconds (e.g., 1 hour → 3,600 s; 30 minutes → 1,800 s; 48 hours → 172,800 s).

#### C. Interceptor Behaviour

1. **POST is cacheable**
   - `POST /v1/assessor` returns `true` from `isRequestCacheable`.
2. **Non-assessor routes are not cached**
   - Other routes are not cached by this interceptor.
3. **Cache key prefixing**
   - Ensure key includes a namespaced prefix, e.g., `assessor:`.
4. **API key scoping (optional/future)**
   - When global caching is disabled or tenant isolation is later required, verify the same DTO with different API keys produces distinct cache keys (e.g., by hashing a keyed identifier).
5. **Error responses are not cached**
   - Ensure 4xx/5xx responses are never cached (e.g., 400, 401, 500).

### 6.2 Integration Tests (Optional but Recommended)

1. **Assessor controller uses caching interceptor**
   - Verify interceptor is applied at controller or method level.
2. **Cache hit avoids LLM call**
   - Mock `LLMService.send` and verify that repeated identical requests result in a single LLM call when cache is enabled.

### 6.3 E2E Tests (Mocked LLM)

#### Functional cache behaviour

1. **Cache hit on identical payload**
   - Send two identical POST requests with the same API key and payload.
   - Expect identical responses; optionally verify LLM HTTP shim is not invoked twice (if observable).
2. **Cache miss on differing payload**
   - Change one field and confirm a new response is generated (mocked LLM still deterministic, but track logging or cache key differences).
3. **TTL override behaviour**
   - Start app with small TTL via `envOverrides` to validate cache expiry (requires a controlled delay).
   - Verify TTL above 48 hours is rejected during config validation.
   - Add an override using `ASSESSOR_CACHE_TTL_HOURS` to confirm hours-based configuration works and takes precedence over minutes.
4. **API key isolation (optional/future)**
   - When a scoped cache is ever required (i.e., global caching disabled), confirm the same payload but different API keys do not share a cached response.
5. **Size-based eviction**
   - Start app with a small `ASSESSOR_CACHE_MAX_SIZE_MIB` and confirm older entries are evicted when the cache exceeds the size cap.
6. **Error response caching guard**
   - Ensure validation or auth failures do not populate the cache.

#### Security-focused cache attack coverage

7. **Cache key inference via payload perturbation**
   - Send near-identical payloads with single-character differences and confirm cache misses occur (no unintended collisions).
8. **Canonicalisation collision attempt**
   - Submit payloads with reordered JSON keys and confirm they map to the **same** cache entry (expected canonicalisation), then verify a different value changes the cache key.
9. **Buffer vs string equivalence**
   - Verify that identical underlying binary content produces the same cache key regardless of whether it arrives as a Node `Buffer` or a data URI string, and that differing base64 content (Buffer vs Buffer, data URI vs data URI, or Buffer vs data URI) yields different keys.
10. **Cross-request contamination attempt**

- Alternate between two distinct payloads rapidly to ensure responses never leak across cache entries.

11. **Replay with modified headers**

- Repeat identical payloads with different non-auth headers and confirm cache hits are based solely on the DTO (no header-based cache poisoning).

12. **Large payload cache poisoning attempt**

- Use maximum-size payloads that approach limits and ensure cached responses are still tied to the correct hash (no truncation or shared entries).

13. **Cache eviction race**

- Force size-based eviction then immediately request a previously cached payload to ensure it is recomputed rather than served incorrectly.

14. **Invalid TTL/size injection**

- Attempt to boot E2E with invalid TTL/size env values (0, negative, above limit) and confirm startup failure to prevent unsafe caching.

15. **Template/version change invalidation**

- Modify prompt templates between requests and ensure cache keys change so template edits invalidate existing cached entries.

16. **File-based image invalidation**

- Change an image file on disk between requests and confirm the altered content hash in the cache key produces a cache miss.

### 6.4 E2E Live (Optional)

- Not required for basic caching behaviour. If run, ensure delays respect rate limits and confirm cache hits do not call the live API unnecessarily.

---

## 7. Security Non-Negotiables

1. **No raw student data in cache keys or logs**.
2. **Hash must be HMAC-based** and use a secret from environment variables.
3. **No persistent storage** of cached data (memory only).
4. **Strict input validation** remains enforced by Zod.
5. **No changes to logging redaction** that might expose request content.
6. **Document response sensitivity**: cached responses may contain derived student content; treat cache contents as sensitive in memory and document accordingly.

---

## 8. Edge Cases to Consider

1. **Buffers vs strings in IMAGE task fields** (`reference`, `template`, `studentResponse`) must canonicalise consistently (the DTO enforces uniform types), while the `images` array always carries string paths.
2. **Whitespace differences** in text payloads are meaningful; hashing must not normalise or trim unless explicitly desired.
3. **Large payloads**: hashing should be efficient and not log or store large strings.
4. **TTL less than 1 minute** must be rejected to avoid indefinite retention; use a feature flag or skip the interceptor to disable caching.
5. **Multiple instances**: cache is per-instance; plan does not attempt cross-node cache consistency.

---

## 9. Files Likely to Be Touched

### Source

- `src/v1/assessor/assessor.controller.ts` (apply cache interceptor)
- `src/v1/assessor/assessor.module.ts` (import/cache module wiring)
- `src/common/cache/assessor-cache.interceptor.ts` (new interceptor)
- `src/common/cache/cache-key.util.ts` (optional helper for canonicalisation + HMAC)
- `src/config/env.schema.ts` (new environment variables)
- `src/config/config.service.ts` (expose new config values, if needed)
- `package.json` (add cache dependencies)

### Tests

- `src/common/cache/assessor-cache.interceptor.spec.ts` (new unit tests)
- `src/common/cache/cache-key.util.spec.ts` (if helper exists)
- `src/v1/assessor/assessor.controller.spec.ts` (interceptor application, integration behaviour)
- `test/assessor-cache.e2e-spec.ts` (new E2E tests)

### Documentation

- `docs/configuration/environment.md`
- `.env.example`
- `.test.env.example` (test defaults)
- (Optional) `docs/architecture/data-flow.md` to reflect caching step

---

## 10. Implementation Sequence (TDD)

1. **Define tests** (unit → integration → E2E) based on the cases listed above.
2. **Implement config** additions and schema validation.
3. **Create cache key utility** with canonicalisation + HMAC.
   3a. **Hash file-based inputs**: ensure the `images` field content is hashed (not just the file path) before the key is derived.
4. **Create custom interceptor** for assessor caching.
5. **Wire interceptor and cache module** into assessor module/controller.
6. **Update documentation** and `.env.example`.
7. **Run lint and tests** according to project scripts.

---

## 11. Acceptance Criteria

- Identical assessor requests return cached responses within TTL.
- Cache keys never expose raw student data.
- Cache TTL defaults to 24 hours and is configurable.
- Hashing uses a secret configured via environment variable.
- File-based images (`images` field) are content-hashed and included in the cache key so content changes always invalidate cached responses.
- All tests pass and quality gates remain enabled.
