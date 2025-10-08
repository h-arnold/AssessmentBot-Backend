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

3.  **API Rate Limiting Configuration**: To prevent hitting Google Gemini API rate limits (especially on the free tier), the test environment includes enhanced retry and backoff settings:
    - `LLM_BACKOFF_BASE_MS`: Set to `2000` (2 seconds) in test environment, doubled from the production default of 1 second
    - `LLM_MAX_RETRIES`: Set to `5` in test environment, increased from the production default of 3
    - Tests include strategic delays between API calls to stay within rate limits:
      - Most tests that call the Gemini API include a 2-second delay before making requests
      - The throttler test uses sequential requests with 600ms delays instead of parallel requests
      - Live API tests include 2-second delays between each test case

    These settings are automatically applied when tests run and help ensure consistent test execution without rate limit errors.

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
6.  **Important**: If your test makes calls to the Gemini API, import and use the `delay()` helper function to add a 2-second delay before API calls to avoid rate limiting:

```typescript
import { startApp, stopApp, delay } from './utils/app-lifecycle';

it('should assess a submission', async () => {
  await delay(2000); // Add delay before API call

  const response = await request(app.appUrl)
    .post('/v1/assessor')
    .set('Authorization', `******
    .send(payload);

  expect(response.status).toBe(201);
});
```

## Troubleshooting

### Rate Limiting Errors (503 Service Unavailable)

If you encounter 503 errors or "Resource Exhausted" messages when running E2E tests:

1.  **Check API Key Tier**: The free tier of the Google Gemini API has stricter rate limits. If tests consistently fail with rate limit errors, you may need to:
    - Use a paid API key with higher limits
    - Increase the delays between API calls in your tests
    - Run tests individually rather than the full suite

2.  **Verify Delay Configuration**: Ensure tests that call the Gemini API include appropriate delays:
    - Standard tests: 2-second delay before API calls using `await delay(2000)`
    - Throttler tests: 600ms delays between sequential requests
    - Live API tests: 2-second delays between test cases

3.  **Check Retry Settings**: The test environment automatically configures enhanced retry settings:
    - `LLM_BACKOFF_BASE_MS=2000` (2 seconds)
    - `LLM_MAX_RETRIES=5`

    These are set in `test/utils/app-lifecycle.ts` and the CI workflow (`.github/workflows/ci.yml`).

4.  **Run Tests Individually**: If the full suite fails due to rate limits, run individual test files:

    ```bash
    npm run test:e2e -- test/auth.e2e-spec.ts
    ```

5.  **Monitor API Usage**: Check your Gemini API quota and usage in the Google Cloud Console to ensure you haven't exceeded limits.
