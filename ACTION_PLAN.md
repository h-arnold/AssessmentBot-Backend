# Action Plan: Privacy-Preserving In-Memory Caching for Assessor Responses

## 1. Objective

Introduce an in-memory cache for assessor responses that:

- uses a privacy-preserving cache key derived from a **hashed** `CreateAssessorDto`,
- applies a **default TTL of 24 hours**, configurable via environment variables,
- incorporates a **secret** (from environment variables) into the hash to strengthen privacy and prevent key enumeration,
- respects the project’s statelessness and security requirements.

This plan is written to follow the repo’s TDD workflow and British English standards.

### Progress Update (Current State)

- [x] Added assessor cache configuration variables and validation rules.
- [ ] Updated documentation for cache configuration variables.
- [x] Implemented HMAC-based cache key generation with canonicalisation and image content hashing.
- [ ] Implemented an in-memory cache interceptor for `POST /v1/assessor` with error-response guards.
- [ ] Implemented a size-aware LRU cache store and wired it through `CacheModule.registerAsync`.
- [ ] Updated assessor controller and module to enable caching.
- [ ] Add remaining unit/integration/E2E tests outlined below (only cache-key utility tests exist so far).
- [ ] Run the full test suite (`npm test`, `npm run test:e2e`) after completing test coverage.

---

## 2. Key Requirements

### Functional

1. **Cache responses for assessor requests** using a key derived from the request DTO.
2. **Cache key must not contain raw student data**. It must be a hash of the DTO.
3. **Cache TTL defaults to 24 hours** (86,400,000 ms) but is configurable via environment variable.
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
3. **Config validation**: any new environment variable must be added to `src/config/env.schema.ts` and documented in `docs/configuration/environment.md`, `.env.example`, and `.test.env.example` (or the test defaults in `test/utils/app-lifecycle.ts`).
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
- hash the DTO using **HMAC-SHA256** (preferable to raw SHA256) with `ASSESSOR_CACHE_HASH_SECRET`,
- create a stable cache key using a **canonical JSON representation** of the DTO (sorted keys and normalised Buffer values).

### 5.2 Canonicalisation Details

- Use a deterministic serialisation function that sorts object keys recursively.
- Convert any `Buffer` values to base64 strings before hashing.
- Ensure no raw request data is logged.

### 5.3 TTL Application

- Cache module default TTL is computed from `ASSESSOR_CACHE_TTL_HOURS` or `ASSESSOR_CACHE_TTL_MINUTES`, converted to **seconds** (and clamped to 48 hours).
- Avoid `@CacheTTL()` unless a compile-time config pattern is introduced; prefer module-level TTL configuration.

### 5.4 Cache Key Scope

- **Decision**: keep caching global (shared across API keys) to maximise cache hits and reduce LLM load.
- **Rationale**: global caching is acceptable for identical assessment payloads because no user-identifying data is included in cache keys and responses are already derived from the payload.
- **Guardrail**: if future requirements demand tenant isolation, include a hashed API key identifier (HMAC with the same secret) in the cache key prefix.

### 5.4.1 Prompt Template Drift

- **Decision**: cache keys do **not** incorporate prompt template versions or content.
- **Rationale**: prompt template changes require a backend rebuild, which naturally invalidates the in-memory cache on restart.

### 5.5 Eviction and Memory Growth

- The default in-memory store does **not** support byte-based limits. To achieve size-based eviction **and** TTL:
  - Implement a **custom cache store** backed by an LRU cache that supports `maxSize` in bytes (for example, using an `lru-cache` instance with `maxSize` and `sizeCalculation`), and wire it through `cache-manager`.
  - Configure the store with:
    - `ttl` computed from `ASSESSOR_CACHE_TTL_HOURS` / `ASSESSOR_CACHE_TTL_MINUTES` (in **seconds**),
    - `maxSize` from `ASSESSOR_CACHE_MAX_SIZE_MIB` (converted to bytes),
    - a `sizeCalculation` function that returns an estimated byte size.
  - This preserves caching for IMAGE tasks and large payloads while ensuring eviction occurs when the cache exceeds 384 MiB by default and entries expire by TTL.

### 5.6 Risk Mitigations and Compatibility Checks

- **Store compatibility**: confirm the chosen `cache-manager` major version and custom store interface are compatible with `@nestjs/cache-manager` before implementation.
- **TTL = 0 semantics**: explicitly reject `ttl = 0` in configuration validation to prevent unbounded retention (privacy requirement).
- **Size calculation strategy**: define a consistent byte sizing approach (for example, serialised JSON byte length for objects and `Buffer.byteLength` for strings/buffers) to avoid under/over-eviction.
- **Template/version drift**: decide whether to include prompt template content or version hash in the cache key to avoid stale responses after template edits.
- **Image file content**: if `images` file paths are supported, **always** include file content hashes in the cache key. File-based requests are the most expensive and must remain cacheable, so content hashing is mandatory.
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
   - File-based images must always be content-hashed and included in the cache key to keep high-cost requests cacheable.

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
4. **API key scoping (if required)**
   - Same DTO but different API keys must yield different cache keys.
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
4. **API key isolation (if required)**
   - Same payload with different API keys should not share a cached response.
5. **Size-based eviction**
   - Start app with a small `ASSESSOR_CACHE_MAX_SIZE_MIB` and confirm older entries are evicted when the cache exceeds the size cap.
6. **Error response caching guard**
   - Ensure validation or auth failures do not populate the cache.

#### Security-focused cache attack coverage

1. **Cache key inference via payload perturbation**
   - Send near-identical payloads with single-character differences and confirm cache misses occur (no unintended collisions).
2. **Canonicalisation collision attempt**
   - Submit payloads with reordered JSON keys and confirm they map to the **same** cache entry (expected canonicalisation), then verify a different value changes the cache key.
3. **Buffer vs string equivalence**
   - Align canonicalisation tests with the runtime prompt path (data URI vs Buffer handling) and verify equivalence/miss behaviour accordingly.
4. **Cross-request contamination attempt**
   - Alternate between two distinct payloads rapidly to ensure responses never leak across cache entries.
5. **Replay with modified headers**

- Repeat identical payloads with different non-auth headers and confirm cache hits are based solely on DTO (no header-based cache poisoning).

1. **Large payload cache poisoning attempt**

- Use maximum-size payloads that approach limits and ensure cached responses are still tied to the correct hash (no truncation or shared entries).

1. **Cache eviction race**

- Force size-based eviction then immediately request a previously cached payload to ensure it is recomputed rather than served incorrectly.

1. **Invalid TTL/size injection**

- Attempt to boot E2E with invalid TTL/size env values (0, negative, above limit) and confirm startup failure to prevent unsafe caching.

1. **Template/version change invalidation**

- Modify prompt templates between requests and ensure cache keys change (or explicitly validate configured behaviour).

1. **File-based image invalidation**

- Change an image file on disk between requests and ensure cache misses occur (content hashing must invalidate cached entries).

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

1. **Buffers vs strings** in IMAGE tasks must canonicalise consistently.
2. **Whitespace differences** in text payloads are meaningful; hashing must not normalise or trim unless explicitly desired.
3. **Large payloads**: hashing should be efficient and not log or store large strings.
4. **TTL = 0** must be rejected to avoid indefinite retention; use a feature flag or skip the interceptor to disable caching.
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
- `.test.env.example` or `test/utils/app-lifecycle.ts` (test defaults)
- (Optional) `docs/architecture/data-flow.md` to reflect caching step

---

## 10. Implementation Sequence (TDD)

### 10.1 Cache Key Utility (Unit Tests → Implementation)

**Scope**: canonicalisation, HMAC hashing, prompt-template drift handling, and image content hashing for file-based images.

**Acceptance criteria**

- Identical DTOs yield identical cache keys.
- Single-field changes (e.g., `studentResponse`) yield different cache keys.
- Cache keys never include raw DTO strings.
- Buffer values are normalised to base64 deterministically.
- Key order does not affect the cache key.
- Changing `ASSESSOR_CACHE_HASH_SECRET` changes the cache key.
- Prompt template drift behaviour is explicit (either included in the key, or explicitly excluded and documented).
- Prompt template changes do not alter cache keys; cache invalidation relies on service restart.
- File-based image content changes invalidate the cache key.

**TDD tests that must pass**

- `src/common/cache/cache-key.util.spec.ts` (add prompt template drift and file-based image coverage if missing).

**Constraints & considerations**

- British English for test descriptions and comments.
- No logging or storage of raw DTO data.
- Decide whether prompt template versions/content are part of the key and document the decision.
- Prompt template versions/content are excluded from the key by design.

**Commit/push instruction**

Commit and push changes for this section.

### 10.2 Config Schema (Unit Tests → Implementation)

**Scope**: env validation, defaults, precedence rules, and TTL conversion.

**Acceptance criteria**

- Defaults: `ASSESSOR_CACHE_TTL_MINUTES = 1440`, `ASSESSOR_CACHE_MAX_SIZE_MIB = 384` when unset.
- Missing `ASSESSOR_CACHE_HASH_SECRET` fails validation.
- Zero/negative TTL fails validation for both hours and minutes.
- TTL above 48 hours fails validation.
- `ASSESSOR_CACHE_TTL_MINUTES` > 2880 and `ASSESSOR_CACHE_TTL_HOURS` > 48 fail validation.
- Non-positive `ASSESSOR_CACHE_MAX_SIZE_MIB` fails validation.
- Hours take precedence over minutes when both are set.
- If hours are invalid but minutes are valid (or vice versa), behaviour is explicit and covered by tests.
- TTL is converted to seconds correctly (1 hour → 3600, 30 minutes → 1800, 48 hours → 172800).

**TDD tests that must pass**

- `src/config/env.schema.assessor-cache.spec.ts` (add hours zero/negative and precedence behaviour tests if missing).

**Constraints & considerations**

- Zod validation only; do not bypass or weaken quality gates.
- Configuration must remain stateless and safe by default.

**Commit/push instruction**

Commit and push changes for this section.

### 10.3 Assessor Cache Interceptor (Unit Tests → Implementation)

**Scope**: cacheability, key prefixing, non-assessor routes, and error-response guard.

**Acceptance criteria**

- `POST /v1/assessor` is cacheable.
- Non-assessor routes are not cached (`trackBy()` returns `undefined`).
- Cache key includes an `assessor:` prefix.
- Error responses (4xx/5xx) are not cached.
- API key scoping behaviour is explicit (global cache vs per-key isolation) and tested.
- API key scoping is global across valid API keys.

**TDD tests that must pass**

- `src/common/cache/assessor-cache.interceptor.spec.ts` (add non-assessor route test, API key scoping if required).

**Constraints & considerations**

- Avoid `@CacheTTL()`; configuration is module-level.
- Ensure no raw request data is logged or used in key material.

**Commit/push instruction**

Commit and push changes for this section.

### 10.4 Cache Store (Unit Tests → Implementation)

**Scope**: LRU size-based eviction, size calculation, and TTL interaction.

**Acceptance criteria**

- Cache evicts least-recently-used entries when size cap is exceeded.
- Size calculation is deterministic and handles large payloads safely.
- TTL expiry is respected alongside size-based eviction.

**TDD tests that must pass**

- `src/common/cache/assessor-cache.store.spec.ts` (new, if a custom store exists).

**Constraints & considerations**

- Byte sizing must be consistent and avoid underestimation.
- No persistent storage.

**Commit/push instruction**

Commit and push changes for this section.

### 10.5 Integration Tests (Controller Wiring)

**Scope**: controller/module wiring and LLM call avoidance on cache hit.

**Acceptance criteria**

- Assessor controller uses the caching interceptor.
- Identical assessor requests result in a single LLM call when cache is enabled.

**TDD tests that must pass**

- `src/v1/assessor/assessor.controller.spec.ts` (or appropriate integration spec).

**Constraints & considerations**

- Use `TestingModule` and existing test patterns.

**Commit/push instruction**

Commit and push changes for this section.

### 10.6 E2E Tests (Mocked LLM)

**Scope**: functional cache behaviour, TTL overrides, size eviction, and security-focused checks.

**Acceptance criteria**

- Cache hit on identical payloads.
- Cache miss on differing payloads.
- TTL overrides work; hours take precedence over minutes.
- Invalid TTL/size values prevent app startup.
- Cache does not store responses for 400/422 validation failures or auth errors.
- Cache does not store responses for 400/422 validation failures or auth errors.
- Cache is global across valid API keys and verified as such.
- Size-based eviction behaves as expected for small `ASSESSOR_CACHE_MAX_SIZE_MIB`.

**TDD tests that must pass**

- `test/assessor-cache.e2e-spec.ts` (add missing TTL hours precedence, invalid values, 400/422 non-caching, API key scoping).

**Constraints & considerations**

- Use mocked LLM only; avoid live calls.
- Keep payloads deterministic to avoid flaky cache-hit assertions.

**Commit/push instruction**

Commit and push changes for this section.

### 10.7 Documentation and Environment Examples

**Scope**: configuration docs and example env files.

**Acceptance criteria**

- New cache-related env vars are documented.
- `.env.example` and test env defaults reflect current schema.
- Any cache key scope decisions are documented.

**TDD tests that must pass**

- No new tests; lint and existing docs checks must pass.

**Constraints & considerations**

- Maintain British English.
- Do not remove or weaken any quality gates.

**Commit/push instruction**

Commit and push changes for this section.

### 10.8 Full Verification

**Scope**: run full test suite and lint.

**Acceptance criteria**

- `npm test` passes.
- `npm run test:e2e` passes.
- `npm run lint` passes.

**Constraints & considerations**

- Resolve failures before moving on.

**Commit/push instruction**

Commit and push changes for this section.

---

## 11. Acceptance Criteria

- Identical assessor requests return cached responses within TTL.
- Cache keys never expose raw student data.
- Cache TTL defaults to 24 hours and is configurable.
- Hashing uses a secret configured via environment variable.
- All tests pass and quality gates remain enabled.
