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

- [x] **Implement Logging E2E Tests**: Create `test/logging.e2e-spec.ts` and implement all test cases as defined in `docs/ImplementationPlan/Stage7/TestCases.md`.
- [x] **Commit Red Phase changes and record commit ID here:** (commit: 86901b0cb676602c8fbabcaa226e08ecb46f55e4)
- [x] **Note any issues or changes that might affect future steps below.**

#### Issues and Solutions Log (Red Phase)

- **Issue**: The initial E2E test file (`logging.e2e-spec.ts`) failed with a `TypeError: request is not a function`.
- **Solution**: The import for the `supertest` library was incorrect. It was changed from `import request from 'supertest'` to `import * as request from 'supertest'` to correctly import the library as a module.
- **Issue**: The first commit attempt failed due to multiple ESLint errors, including incorrect import order and disallowed `console.log` statements.
- **Solution**: All linting errors were fixed by reordering imports according to project standards and replacing a temporary `console.log` with an explicit `expect()` assertion in the skipped test case.

### Green Phase: Implementation

- [x] **Install Dependencies**:
  ```bash
  npm install nestjs-pino pino-http
  npm install -D pino-pretty
  ```
- [x] **Update `ConfigService`**: Add `LOG_LEVEL` to the Zod schema in `src/config/config.service.ts`.
- [x] **Configure `LoggerModule` in `AppModule`**: In `src/app.module.ts`, import and configure `LoggerModule` from `nestjs-pino` to use the `ConfigService` and set up `pinoHttp` options (transport, serializers).
  - [x] **Configure Pino HTTP Middleware/Interceptor**: apply `pinoHttp` globally to capture all requests and responses.
  - [x] **Configure `Authorization` Header Redaction**: use `pinoHttp` serializers to mask or redact `Authorization` headers in logs.
  - [x] **Update `.env.example`**: add `LOG_LEVEL` entry documenting the configurable log level.
- [x] **Replace Default Logger in `main.ts`**: Update `main.ts` to call `app.useLogger(app.get(Logger));`.
- [x] **Refactor Existing Logger Usage**: Replace all `new Logger()` instantiations with dependency injection. Key targets:
  - [x] `src/auth/api-key.service.ts`
  - [x] `src/config/config.service.ts`
  - [x] `src/common/http-exception.filter.ts`
  - [x] `src/common/json-parser.util.ts`
  - [x] `src/llm/gemini.service.ts`
  - [x] `src/prompt/prompt.base.ts`
- [x] **Commit Green Phase changes and record commit ID here:** (commit: 969e94c89db4a63b36d5f442c6ce4f60825ec6bb)
- [x] **Note any issues or changes that might affect future steps below.**

#### Issues and Solutions Log (Green Phase)

- **Issue**: After implementing the logger, a large number of unit and integration tests failed due to dependency injection issues. NestJS was unable to resolve the `Logger` dependency for various services and modules.
- **Solution**: The root cause was that modules importing `CommonModule` (which contains the now logger-dependent `HttpExceptionFilter`) did not have access to the `Logger` provider. The solution was to add `Logger` to the `providers` and `exports` arrays of `CommonModule` itself. This made the `Logger` available to any module that imports `CommonModule`, resolving the cascading dependency failures.
- **Issue**: The `ConfigService` validation was failing in tests because the `LOG_LEVEL` environment variable was not correctly mocked.
- **Solution**: The test setup files (`*.spec.ts`) for modules using `ConfigService` were updated to include a valid `LOG_LEVEL` (e.g., 'debug') in the mocked environment variables.
- **Issue**: Multiple commit attempts were blocked by the `husky` pre-commit hook due to persistent ESLint errors, particularly a tricky `explicit-function-return-type` error in the `app.module.ts` `LoggerModule.forRootAsync` configuration.
- **Solution**: After several attempts, the issue was resolved by importing `Params` from `nestjs-pino` to explicitly type the return value of the `useFactory` function, and importing `IncomingMessage` from `http` to correctly type the `req` parameter in the pino serializer.

### Refactor Phase

- [ ] **Verify Log Output**: Manually run the app and inspect console output to confirm logs are structured, colourised (in dev), and contain context.
- [ ] **Code Cleanup**: Ensure all new code is documented and follows project standards.

---

## Part 2: Rate Limiting (Throttling)

**Goal:** Prevent abuse by limiting request rates per API key.

### Red Phase: Failing Tests

- [ ] **Implement Throttling E2E Tests**: Create `test/throttler.e2e-spec.ts` and implement all test cases as defined in `docs/ImplementationPlan/Stage7/TestCases.md`.
- [ ] **Commit Red Phase changes and record commit ID here:** (commit: )
- [ ] **Note any issues or changes that might affect future steps below.**

#### Issues and Solutions Log (Red Phase)

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

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
- [ ] **Commit Green Phase changes and record commit ID here:** (commit: )
- [ ] **Note any issues or changes that might affect future steps below.**

#### Issues and Solutions Log (Green Phase)

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

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
