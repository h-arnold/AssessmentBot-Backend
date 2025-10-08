# Release Notes - Version 0.1.3

**Release Date**: 2025-01-08

## Overview

Version 0.1.3 focuses on dependency updates and test infrastructure improvements to enhance reliability and maintainability. This release includes comprehensive updates to npm dependencies and implements robust rate limiting mitigation strategies for E2E tests.

## What's New

### Dependency Updates

Updated 21 npm packages to their latest compatible versions:

**Core Dependencies:**

- `@google/genai`: 1.19.0 → 1.22.0
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`: 11.1.5/11.1.4 → 11.1.6
- `@nestjs/testing`: 11.1.5 → 11.1.6
- `nestjs-pino`: 4.4.0 → 4.4.1
- `dotenv`: 17.2.2 → 17.2.3
- `zod`: 4.1.8 → 4.1.12

**Development Dependencies:**

- `@nestjs/schematics`: 11.0.7 → 11.0.8
- `@typescript-eslint/eslint-plugin`: 8.44.0 → 8.46.0
- `@typescript-eslint/parser`: 8.44.1 → 8.46.0
- `typescript-eslint`: 8.44.0 → 8.46.0
- `eslint`: 9.35.0 → 9.37.0
- `jest`: 30.1.3 → 30.2.0
- `typescript`: 5.9.2 → 5.9.3
- `lint-staged`: 16.1.6 → 16.2.3
- And 7 more packages (see full list in PR #[number])

**Note on pino-http:** Remains at v10.5.0 (latest v11.0.0) due to peer dependency constraints with nestjs-pino@4.4.1.

### Test Infrastructure Improvements

#### API Rate Limiting Mitigation

Implemented comprehensive strategies to prevent Google Gemini API rate limit errors in E2E tests:

1. **Enhanced Retry Configuration**
   - Increased `LLM_BACKOFF_BASE_MS` from 1000ms to 2000ms
   - Increased `LLM_MAX_RETRIES` from 3 to 5
   - Applied in test environment and CI workflows

2. **Strategic Delays**
   - Added `delay()` helper function in test utilities
   - 2-second delays before Gemini API calls in auth, assessor, and logging tests
   - 2-second delays in live API tests
   - Sequential execution with 600ms delays in throttler tests

3. **Test Configuration Updates**
   - Modified throttler tests to use sequential requests instead of parallel
   - Increased throttler TTL from 5s to 20s in tests
   - Updated test timeouts to accommodate delays

4. **CI/CD Improvements**
   - Added rate limiting environment variables to GitHub Actions workflows
   - Ensures consistent behaviour across local and CI environments

#### Documentation Updates

- Comprehensive E2E testing guide with API rate limiting section
- Troubleshooting guide for rate limit errors
- Examples for adding delays in new tests
- Updated testing README with configuration summary

### Bug Fixes & Improvements

- Fixed `.gitignore` to properly exclude `junit/` and `coverage/` test artefacts
- Resolved intermittent E2E test failures due to API rate limiting
- All tests now pass consistently (28 unit test suites, 7 E2E test suites)

## Testing

- ✅ **Unit Tests**: 28 suites, 186 tests - All passing
- ✅ **E2E Tests**: 7 suites, 45 tests - All passing consistently
- ✅ **Linting**: All checks passing
- ✅ **Security**: No vulnerabilities detected

## Migration Guide

### For Users

No action required. This release includes only internal improvements and dependency updates. The API remains unchanged.

### For Developers

If you're contributing to the project:

1. **New E2E Tests**: When adding tests that call the Gemini API, use the `delay()` helper:

   ```typescript
   import { startApp, stopApp, delay } from './utils/app-lifecycle';

   it('should assess submission', async () => {
     await delay(2000); // Add before API calls
     // ... your test code
   });
   ```

2. **Rate Limiting**: The test environment automatically applies enhanced retry settings. No manual configuration needed.

3. **Documentation**: Review updated testing guides in `docs/testing/` for best practices.

## Breaking Changes

None. This release is fully backwards compatible.

## Known Issues

- `pino-http` remains at v10.5.0 pending nestjs-pino support for v11.0.0
- Free tier Gemini API keys may still experience occasional rate limits under heavy concurrent test execution

## Contributors

- @h-arnold - Project maintainer
- @copilot - Automated dependency updates and test improvements

## Links

- [Full Changelog](https://github.com/h-arnold/AssessmentBot-Backend/compare/v0.1.2...v0.1.3)
- [Pull Request](https://github.com/h-arnold/AssessmentBot-Backend/pull/[number])

---

For questions or issues, please open an issue on [GitHub](https://github.com/h-arnold/AssessmentBot-Backend/issues).
