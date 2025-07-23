# Throttler Implementation Summary

This document summarises the final implementation of the application's rate-limiting (throttling) feature. The initial plan was revised to adopt a more robust and maintainable approach using a global guard with decorator-based overrides.

## Final Implementation Steps

- [x] **Centralise Validation with a Shared Zod Schema:**
  - The Zod schema for all environment variables was extracted to `src/config/env.schema.ts`.
  - This schema now serves as the single source of truth for configuration validation across the application.

- [x] **Update `ConfigService` for Runtime Configuration:**
  - `ConfigService` was updated to import and use the shared schema from `env.schema.ts` for validating environment variables at application startup.

- [x] **Create Compile-Time Configuration for Throttling:**
  - A new file, `src/config/throttler.config.ts`, was created to handle configuration needed at compile time.
  - This file imports the shared `env.schema.ts` to validate `process.env` directly, making the values available to decorators.
  - It exports the configuration objects used for global and per-route throttling.

- [x] **Implement Global Throttler Guard:**
  - In `app.module.ts`, the `ThrottlerModule` was configured with a default setting for unauthenticated routes.
  - The `ThrottlerGuard` was registered as a global guard (`APP_GUARD`), automatically protecting all endpoints with this default limit.

- [x] **Implement Per-Route Throttler Override:**
  - In `src/v1/assessor/assessor.controller.ts`, the `@Throttle()` decorator was applied at the controller level.
  - This decorator uses the `authenticatedThrottler` configuration to override the global default, applying a stricter limit for this authenticated endpoint.

- [x] **Refactor and Document:**
  - Redundant, module-specific throttler configurations were removed.
  - Detailed JSDoc comments were added to all affected configuration files, `app.module.ts`, and `assessor.controller.ts` to explain the new architecture.

- [x] **Verify Implementation:**
  - The `throttler.e2e-spec.ts` test suite was used to validate the final implementation, confirming that both global and overridden rate limits work as expected.

## Implementation Notes

The initial plan involved defining named throttlers (e.g., 'unauthenticated', 'authenticated'). However, the final implementation uses a global guard combined with decorator-based overrides, which is a more idiomatic and maintainable approach in NestJS.

This revised strategy provides several advantages:

- **Clarity:** It's immediately clear from a controller's decorators what rate-limiting rules apply.
- **Maintainability:** Centralising the configuration values in `throttler.config.ts` and the validation in `env.schema.ts` makes the system easier to manage.
- **Robustness:** Using a shared validation schema for both runtime and compile-time configuration prevents inconsistencies and ensures all configuration is type-safe.
