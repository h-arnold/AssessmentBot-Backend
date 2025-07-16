# Stage 7: Logging and Throttling Implementation Plan (v4)

This document outlines the tasks required to implement structured logging and API rate limiting. It is based on a detailed analysis of the existing `AuthModule`, `ConfigModule`, and E2E test logging setup.

**Key Documents:**

- **Detailed Test Cases:** See [TestCases.md](./TestCases.md) for a comprehensive list of all E2E tests for this stage.

**Pre-computation Analysis:**

- **Configuration:** All new configuration values (log levels, throttle limits) MUST be added to the Zod schema in `src/config/config.service.ts` and accessed via the `ConfigService`.
- **Authentication:** The API key is passed as a bearer token in the `Authorization` header. The `ApiKeyThrottlerGuard` MUST extract the key from this header.
- **E2E Test Logging:** The current E2E tests manually create and apply a `ConsoleLogger`. The new logging tests MUST respect and adapt this pattern to avoid disrupting existing test output.

---

## Part 1: Structured Logging

**Goal:** Replace the default NestJS logger with `nestjs-pino` for structured, request-aware JSON logging.

### Red Phase: Failing Tests

- [ ] **Implement Logging E2E Tests**: Create `test/logging.e2e-spec.ts` and implement all test cases as defined in `docs/ImplementationPlan/Stage7/TestCases.md`.

### Green Phase: Implementation

- [ ] **Install Dependencies**:
  ```bash
  npm install nestjs-pino pino-http
  npm install -D pino-pretty
  ```
- [ ] **Update `ConfigService`**: Add `LOG_LEVEL` to the Zod schema in `src/config/config.service.ts`.
- [ ] **Configure `LoggerModule` in `AppModule`**: In `src/app.module.ts`, import and configure `LoggerModule` from `nestjs-pino` to use the `ConfigService` and set up `pinoHttp` options (transport, serializers).
  - [ ] **Configure Pino HTTP Middleware/Interceptor**: apply `pinoHttp` globally to capture all requests and responses.
  - [ ] **Configure `Authorization` Header Redaction**: use `pinoHttp` serializers to mask or redact `Authorization` headers in logs.
  - [ ] **Update `.env.example`**: add `LOG_LEVEL` entry documenting the configurable log level.
- [ ] **Replace Default Logger in `main.ts`**: Update `main.ts` to call `app.useLogger(app.get(Logger));`.
- [ ] **Refactor Existing Logger Usage**: Replace all `new Logger()` instantiations with dependency injection. Key targets:
  - `src/auth/api-key.service.ts`
  - `src/config/config.service.ts`
  - `src/common/http-exception.filter.ts`
  - `src/common/json-parser.util.ts`
  - `src/llm/gemini.service.ts`
  - `src/prompt/prompt.base.ts`

### Refactor Phase

- [ ] **Verify Log Output**: Manually run the app and inspect console output to confirm logs are structured, colourised (in dev), and contain context.
- [ ] **Code Cleanup**: Ensure all new code is documented and follows project standards.

---

## Part 2: Rate Limiting (Throttling)

**Goal:** Prevent abuse by limiting request rates per API key.

### Red Phase: Failing Tests

- [ ] **Implement Throttling E2E Tests**: Create `test/throttler.e2e-spec.ts` and implement all test cases as defined in `docs/ImplementationPlan/Stage7/TestCases.md`.

### Green Phase: Implementation

- [ ] **Install Dependencies**:
  ```bash
  npm install nestjs-throttler
  ```
- [ ] **Update `ConfigService`**: Add `THROTTLER_TTL` and `THROTTLER_LIMIT` to the Zod schema in `src/config/config.service.ts`.
- [ ] **Integrate `ThrottlerModule` in `AppModule`**: Configure `ThrottlerModule` asynchronously to use the `ConfigService` for `ttl` and `limit` values.
  - [ ] **Update `.env.example`**: add `THROTTLER_TTL` and `THROTTLER_LIMIT` entries for documentation.
  - [ ] **Ensure Docker/Compose Pass Env Vars**: update `docker-compose.yml` and `Dockerfile` to expose `LOG_LEVEL`, `THROTTLER_TTL`, and `THROTTLER_LIMIT` inside the container.
- [ ] **Create `ApiKeyThrottlerGuard`**: Create `src/auth/api-key-throttler.guard.ts`. The guard must extend `ThrottlerGuard`, inject the `Logger`, override `getTracker()` to use the API key, and override `handleRequest()` to log throttled events.
- [ ] **Apply Global Guard**: Add `ApiKeyThrottlerGuard` to the global providers list in `src/app.module.ts`.

### Refactor Phase

- [ ] **Review Configuration**: Ensure the default `ttl` and `limit` values are sensible.
- [ ] **Documentation**: Add JSDoc comments to `ApiKeyThrottlerGuard`.

---

## Completion Checklist

- [ ] All "Red Phase" tests are written and initially failing.
- [ ] All "Green Phase" implementation tasks are complete.
- [ ] All tests are passing.
- [ ] The `TODO.md` file is updated with checkmarks.
- [ ] A final review of the code for quality, clarity, and adherence to project standards has been conducted.
- [ ] **Update CI Pipeline**: ensure CI runs the new E2E specs (`logging.e2e-spec.ts` and `throttler.e2e-spec.ts`) and fails on failures.
- [ ] **Update Lint & Coverage Rules**: confirm lint and code coverage checks include the new modules and adjust thresholds if necessary.
