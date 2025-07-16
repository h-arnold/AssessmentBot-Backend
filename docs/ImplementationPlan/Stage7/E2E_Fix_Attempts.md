# E2E Test Troubleshooting Log

This document records the attempts made to fix the End-to-End (E2E) tests after introducing the `nestjs-pino` logger.

## Attempt 1: Spying on `process.stdout`

- **Action**: Used `jest.spyOn(process.stdout, 'write')` in `logging.e2e-spec.ts` to capture raw console output.
- **Result**: This approach was brittle and failed. It was highly dependent on the internal logging implementation of the libraries and did not address the root cause of the failures in other E2E suites.

## Attempt 2: Custom `MemoryStream` Helper

- **Action**: Created a `test-utils.ts` file with a `MemoryStream` class and a helper function to manually create a `PinoLogger` instance and apply it using `app.useLogger()`.
- **Result**: This failed because it broke NestJS's dependency injection. Manually creating the logger meant that other components (like the `HttpExceptionFilter`) that depended on the `Logger` could not resolve their dependencies, leading to application crashes (500 errors) during tests.

## Attempt 3: Overriding `LoggerModule` in a Single Test

- **Action**: Refactored `logging.e2e-spec.ts` to use `Test.createTestingModule().overrideModule(LoggerModule)...` to provide a test-specific logger configuration.
- **Result**: This fixed the `logging.e2e-spec.ts` in isolation but caused other E2E tests to fail. The error `PinoLogger is marked as a scoped provider...` highlighted that the logger has a request scope and cannot be retrieved with `app.get()` at the application level. The other test suites were still missing the `Logger` provider.

## Attempt 4: Overriding `LoggerModule` in All E2E Tests

- **Action**: Applied the `overrideModule` pattern to all E2E test suites (`auth`, `assessor`, `assessor-live`) to provide a silent logger, satisfying the dependency injection.
- **Result**: This exposed a deeper issue. The tests still failed, but with new errors:
  - **`HttpExceptionFilter` Failure**: Tests that expected custom error formats failed because the `HttpExceptionFilter` was being instantiated manually in the test setups (`new HttpExceptionFilter()`), which bypassed dependency injection. The filter, therefore, did not receive its `Logger` dependency and was not being applied correctly.
  - **Payload Size Errors**: The `logging.e2e-spec.ts` failed on the large payload test because it was missing the `json` middleware to increase the request body size limit.

## Attempt 5: Global Filter Registration (In Progress)

- **Action**: The current hypothesis is that the `HttpExceptionFilter` must be registered globally via a provider in a module (`CommonModule`) rather than being applied imperatively in `main.ts` or manually in tests. This ensures it is managed by the DI container everywhere.
- **Result**: This is the current path of investigation. The last action was to modify `common.module.ts` to register the filter using the `APP_FILTER` provider token. The next step is to verify this solution.

## Attempt 6: Architectural Review and Correction

- **Action**: Conducted a full architectural review of the logging implementation, focusing on `app.module.ts`, `main.ts`, `common.module.ts`, `http-exception.filter.ts`, and `logging.e2e-spec.ts`.
- ** Summary of Findings**:
  - **Root Cause Identified**: The primary architectural flaw is the manual instantiation of `HttpExceptionFilter` in `main.ts` (`app.useGlobalFilters(new HttpExceptionFilter(app.get(Logger)))`). This method bypasses the NestJS Dependency Injection (DI) container.
  - **Impact**: Because the filter is created outside the DI container, it does not behave consistently, especially in the E2E test environment where the `LoggerModule` is overridden. This causes the filter to either not be applied at all or to fail due to missing dependencies, explaining the failures in multiple test suites.
  - **Confirmation**: The `nestjs-pino` implementation itself (`LoggerModule.forRootAsync`) is architecturally sound and correctly configured. The issue is not the logger, but the integration of a logger-dependent component.
- **Proposed Solution**:
  1.  **Rely on DI for the Global Filter**: The registration of `HttpExceptionFilter` in `common.module.ts` using the `APP_FILTER` provider is the correct approach.
  2.  **Remove Manual Instantiation**: The line `app.useGlobalFilters(new HttpExceptionFilter(app.get(Logger)));` **must be removed** from `src/main.ts` to prevent conflicts and ensure the DI-managed instance is used globally.

** Complete Report **

1. `AppModule` and `LoggerModule` Configuration:
   - Good: The use of LoggerModule.forRootAsync is correct. It properly uses ConfigModule to
     asynchronously fetch the LOG_LEVEL, ensuring that the logger's configuration is driven by the
     central ConfigService. This is a robust and maintainable pattern.
   - Good: The pinoHttp configuration correctly sets up a transport for pino-pretty in development,
     which is great for readability.
   - Good: The serializers option is used to redact the Authorization header. This is a crucial
     security measure.

2. `main.ts` - Global Logger and Filter:
   - Problematic: The line app.useGlobalFilters(new HttpExceptionFilter(app.get(Logger))); is a
     significant architectural flaw. Here's why:
     - Bypasses Dependency Injection (DI): new HttpExceptionFilter(...) manually instantiates the
       filter, completely bypassing NestJS's DI container for this instance.
     - Causes DI Mismatches: While the Logger is retrieved from the app container
       (app.get(Logger)), the HttpExceptionFilter itself is not managed by DI. This creates an
       "island" instance. If HttpExceptionFilter were to have other dependencies, they would not
       be injected.
     - Root of E2E Failures: This is the most likely cause of the E2E test failures described in
       E2E_Fix_Attempts.md. When tests override modules (like the LoggerModule), the
       app.get(Logger) in main.ts might get a different logger instance than the one provided to
       the rest of the application's DI container. This leads to inconsistent behavior and
       dependency resolution errors.
   - Correct Approach: The filter should be registered as a global provider using the APP_FILTER
     token within a module (as was attempted in "Attempt 5"). This ensures it's part of the DI
     ecosystem and receives its dependencies correctly and consistently everywhere.

3. `CommonModule`:
   - Good: Providing Logger from this module is a good step towards centralizing common providers.
   - Improvement: The APP_FILTER provider that was added is the correct way to register the
     HttpExceptionFilter globally. This change should be kept and the manual
     app.useGlobalFilters(...) in main.ts should be removed.

4. `HttpExceptionFilter`:
   - Good: The filter correctly injects the Logger via its constructor, adhering to DI principles.
   - Good: The logic for handling different error types and sanitising headers for security is
     robust. The filter itself is well-designed; the issue lies in how it's instantiated.

5. `config.service.ts`:
   - Excellent: The use of Zod for schema-based validation is a best practice and makes the
     application's configuration robust and type-safe.
   - Minor Inconsistency: The LOG_LEVEL enum (log, error, warn, debug, verbose, fatal) contains
     values that don't perfectly align with the standard Pino levels (trace, debug, info, warn,
     error, fatal). This is a minor point and doesn't cause a functional error but could be refined
     for better alignment with the underlying library.

6. `logging.e2e-spec.ts`:
   - Problematic: The test setup is fragile because it has to manually replicate middleware from
     main.ts, such as app.use(json({ limit: payloadLimit })). More importantly, it does not replicate
     the registration of the HttpExceptionFilter. This means the tests run in an environment that is
     significantly different from the production application, which is a primary cause of the test
     failures. The fix of registering the filter via APP_FILTER in CommonModule will resolve this
     discrepancy.

## Attempt 7: Centralized E2E Test Setup with `TestAppModule`

- **Action**: Created `test/test-app.module.ts` to centralize the E2E test setup, importing `AppModule` and providing `HttpExceptionFilter` via `APP_FILTER`. Refactored all E2E tests to use `TestAppModule` instead of `AppModule`.
- **Result**: All E2E tests failed with `TypeError: logLevels.map is not a function` during `app.init()`. This indicated a conflict with the default NestJS `ConsoleLogger` still being used in the test environment, despite `nestjs-pino` being configured. Also, `TypeError: request is not a function` in `logging.e2e-spec.ts` persisted.

## Attempt 8: Remove `app.useLogger` from `main.ts` and provide `Logger` in `AppModule`

- **Action**: Removed `app.useLogger(app.get(Logger))` from `src/main.ts` and added `Logger` to the `providers` array in `src/app.module.ts` (initially without import, then corrected).
- **Result**: Still encountered `TypeError: logLevels.map is not a function`. This indicated that the `Logger` being provided in `AppModule` was still the default NestJS `Logger` and not the `PinoLogger` from `nestjs-pino`.

## Attempt 9: Remove `Logger` from `CommonModule`'s providers/exports and import `LoggerModule`

- **Action**: Removed `Logger` from `providers` and `exports` in `src/common/common.module.ts`. Imported `LoggerModule` into `CommonModule`.
- **Result**: All E2E tests failed with `Nest can't resolve dependencies of the JsonParserUtil (?). Please make sure that the argument Logger at index [0] is available in the CommonModule context.` This confirmed that `JsonParserUtil` in `CommonModule` still requires a `Logger` and that simply importing `LoggerModule` into `CommonModule` was not sufficient to make the `PinoLogger` available to `JsonParserUtil` within `CommonModule`'s context.

## Attempt 10: Fixing Unit Test Dependency Injection for Logger

- **Action**: Add `LoggerModule.forRootAsync` to the `imports` array of `TestingModule` in `llm.module.spec.ts`, `assessor.module.spec.ts`, and `assessor.service.spec.ts`.
- **Result**: Initial attempts resulted in `ReferenceError: LoggerModule is not defined` or `ConfigModule is not defined` because the necessary imports were missing in the test files.
- **Solution**:
  - Added `import { LoggerModule } from 'nestjs-pino';` to `llm.module.spec.ts`, `assessor.module.spec.ts`, and `assessor.service.spec.ts`.
  - Added `import { ConfigModule } from '../../config/config.module';` to `assessor.module.spec.ts` and `assessor.service.spec.ts`.
  - Ensured `ConfigModule` was included in the `imports` array of `LoggerModule.forRootAsync` within the test files, as `LoggerModule` needs to resolve `ConfigService` from its own context.
  - Added `LOG_LEVEL: 'debug'` to the `mockConfigService` in `assessor.module.spec.ts` to ensure the logger was initialized with a valid level.
- **Outcome**: All unit tests are now passing. This indicates that the logger's dependency injection is correctly configured within the isolated unit test environments.
