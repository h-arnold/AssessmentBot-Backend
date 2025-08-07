# E2E Testing Guide

This document provides instructions for setting up and running the End-to-End (E2E) tests for the AssessmentBot-Backend.

## Running E2E Tests

To run the entire E2E test suite, use the following command:

```bash
npm run test:e2e
```

This command builds the application and executes all test specifications (`*.e2e-spec.ts`) in the `test/` directory.

## Test Environment

E2E tests are managed by utilities in `test/utils/` to ensure each test file runs against a fresh, isolated application instance.

### Environment Configuration

The test setup uses a specific strategy for managing environment variables to ensure reliability and security:

1.  **Hardcoded Test Configuration**: Most configuration variables (`PORT`, `API_KEYS`, `THROTTLER_TTL`, etc.) are hardcoded within the `startApp` function in `test/utils/app-lifecycle.ts`. This guarantees that all tests run with the exact same configuration, simplifying setup and preventing flaky tests.

2.  **Live API Key (`GEMINI_API_KEY`)**: The `GEMINI_API_KEY` is a sensitive secret and is handled differently:
    - **Default**: A dummy key (`dummy-key-for-testing`) is injected by default. This allows all tests that do not require a live API call to run without any special setup.
    - **Live Tests**: To run the live test (`assessor-live.e2e-spec.ts`), which makes real calls to the Gemini API, you **must** provide a valid `GEMINI_API_KEY`. Create a file named `.test.env` in the project's root directory and add the following:

      ```
      GEMINI_API_KEY=your_real_api_key_here
      ```

    The `startApp` function automatically detects this file and uses the key if it exists. This is the **only** recommended use for the `.test.env` file.

### Overriding Environment Variables

For specific scenarios, such as testing throttler limits, you can override the default environment variables by passing an `envOverrides` object to the `startApp` function.

**Example:**

```typescript
describe('Throttler E2E Test', () => {
  let app: AppInstance;

  beforeAll(async () => {
    const envOverrides = {
      AUTHENTICATED_THROTTLER_LIMIT: '5', // Override default
      THROTTLER_TTL: '10',
    };
    app = await startApp('/tmp/throttler-test.log', envOverrides);
  });

  afterAll(() => {
    stopApp(app.appProcess);
  });

  it('should block requests after reaching the limit', async () => {
    // ... test logic
  });
});
```

## How to Add a New E2E Test

1.  Create a new file in the `test/` directory with the suffix `.e2e-spec.ts` (e.g., `my-feature.e2e-spec.ts`).
2.  Import `startApp` and `stopApp` from `./utils/app-lifecycle.ts`.
3.  Use `beforeAll` to call `startApp`. Pass an `envOverrides` object if needed.
4.  Use `afterAll` to call `stopApp` to terminate the application process.
5.  Write your tests using `supertest` to make requests to the `appUrl` provided by the `startApp` result.
