# Refactoring Plan: Two-Tiered Throttling and Authentication

This document outlines the step-by-step process to refactor the application's rate-limiting and authentication flow to a more robust, secure, and idiomatic two-tiered model. The goal is to separate the concerns of rate-limiting from authentication, applying different limits to anonymous and authenticated users.

---

### Step 1: Update Configuration (`src/config/config.service.ts`)

- [ ] In the `configSchema`, remove the old `THROTTLER_TTL` and `THROTTLER_LIMIT` properties.
- [ ] Add four new properties to the `configSchema` to support named tiers:
  - [ ] `THROTTLER_ANONYMOUS_TTL`: TTL for unauthenticated requests (e.g., 60).
  - [ ] `THROTTLER_ANONYMOUS_LIMIT`: Request limit for unauthenticated requests (e.g., 10).
  - [ ] `THROTTLER_AUTHENTICATED_TTL`: TTL for authenticated requests (e.g., 60).
  - [ ] `THROTTLER_AUTHENTICATED_LIMIT`: Request limit for authenticated requests (e.g., 100).

### Step 2: Update Environment Files

- [ ] In `.env.example`, remove the old `THROTTLER_TTL` and `THROTTLER_LIMIT` variables.
- [ ] Add the four new environment variables (`THROTTLER_ANONYMOUS_TTL`, `THROTTLER_ANONYMOUS_LIMIT`, `THROTTLER_AUTHENTICATED_TTL`, `THROTTLER_AUTHENTICATED_LIMIT`) to `.env.example` with sensible default values.
- [ ] In `test/utils/e2e-test-utils.ts`, update the `startApp` function to set the new environment variables for the test process and remove the old ones.

### Step 3: Update Main Application Module (`src/app.module.ts`)

- [ ] In the `providers` array, remove the global `ApiKeyGuard`. It should not be applied globally.
- [ ] Ensure `ApiKeyThrottlerGuard` remains the only relevant global guard in this array.
- [ ] Modify the `ThrottlerModule.forRootAsync` configuration:
  - [ ] The `useFactory` should now return an array of **named throttler configurations** instead of a single default one.
  - [ ] Create a configuration named `'anonymous'` using the `THROTTLER_ANONYMOUS_*` values from `ConfigService`.
  - [ ] Create a configuration named `'authenticated'` using the `THROTTLER_AUTHENTICATED_*` values from `ConfigService`.

### Step 4: Refactor the Custom Throttler Guard (`src/auth/api-key-throttler.guard.ts`)

- [ ] Rewrite the `ApiKeyThrottlerGuard` to be clean and simple.
- [ ] The constructor should inject the `ThrottlerStorageService`, `Reflector`, and `ApiKeyService`.
- [ ] Remove any manual calls to `apiKeyGuard.canActivate()`.
- [ ] Override the `getTracker(req)` method:
  - [ ] If an `Authorization: Bearer <token>` header exists, return the token.
  - [ ] Otherwise, fall back to returning the request's IP address (`req.ip`).
- [ ] Override the `getThrottlerOptions(context)` method:
  - [ ] Get the request object from the `context`.
  - [ ] Extract the API key from the header.
  - [ ] If no key exists, return `{ name: 'anonymous' }` to select the anonymous rate limit.
  - [ ] Use the injected `ApiKeyService` to validate the key.
  - [ ] If the key is valid, return `{ name: 'authenticated' }`.
  - [ ] If the key is invalid, return `{ name: 'anonymous' }`.

### Step 5: Restore Controller-Level Authentication

- [ ] In `src/v1/assessor/assessor.controller.ts`, re-apply the `@UseGuards(ApiKeyGuard)` decorator to the `AssessorController` class. This ensures it runs _after_ the global throttler and only on the routes that need it.

### Step 6: Update E2E Tests (`test/throttler.e2e-spec.ts`)

- [ ] Refactor the entire test suite to align with the new two-tiered system.
- [ ] **Test Case 1**: Verify that requests **without** an API key are correctly throttled according to the stricter `'anonymous'` limit.
- [ ] **Test Case 2**: Verify that requests **with** a valid API key are correctly throttled according to the more lenient `'authenticated'` limit.
- [ ] **Test Case 3**: Verify that requests with an **invalid** API key are throttled using the `'anonymous'` limit and then rejected with a `401 Unauthorized` by the `ApiKeyGuard`.
- [ ] **Test Case 4**: Ensure that different valid API keys are throttled independently under the `'authenticated'` tier.
- [ ] **Test Case 5**: Ensure the `Retry-After` header is present on all throttled (429) responses.

### Step 7: Final Cleanup

- [ ] Review all modified files for code clarity, comments, and adherence to project style guides.
- [ ] Delete any temporary or now-obsolete files created during previous attempts.
