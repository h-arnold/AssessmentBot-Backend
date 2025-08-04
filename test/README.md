# End-to-End (E2E) Testing Guide

This document provides instructions for setting up and running the End-to-End (E2E) tests for the AssessmentBot-Backend.

## Running Tests

To run the entire E2E test suite, use the following command:

```bash
npm run test:e2e
```

This command will first build the application and then execute all test specifications located in the `test/` directory using Jest.

## Test Environment Configuration

The E2E test environment is carefully managed by the `test/utils/app-lifecycle.ts` and `test/utils/log-watcher.ts` utilities. They are responsible for starting and stopping the application in a child process for each test file, ensuring a clean and isolated environment.

### Core Principles

- **Isolation**: Each test file (`*.e2e-spec.ts`) runs against a fresh instance of the application.
- **Consistency**: The application's configuration for tests is explicitly defined and injected at startup, preventing inconsistencies between test runs and different developer machines.

### Environment Variable Management

The test setup follows a specific strategy for managing environment variables to ensure reliability and security:

1.  **Hardcoded Test Configuration**: Most configuration variables required for testing (e.g., `PORT`, `API_KEYS`, `THROTTLER_TTL`, `THROTTLER_LIMIT`) are hardcoded directly within the `startApp` function in `test/utils/app-lifecycle.ts`. These values are then programmatically injected into the application's environment (`process.env`) when the test instance starts.

    **Reasoning**: This approach guarantees that all tests run with the exact same configuration, eliminating a common source of test failures. It avoids the need for developers to manage multiple environment variables in a `.env` file, simplifying the setup process.

2.  **Live API Key (`GEMINI_API_KEY`)**: The only exception to the hardcoding rule is the `GEMINI_API_KEY`. This is a sensitive secret and is handled as follows:
    - **For most tests**: A dummy key (`dummy-key-for-testing`) is automatically injected. This allows the application to pass its configuration validation and start successfully, enabling all tests that do not require a live API call to run without any special setup.
    - **For live tests (`assessor-live.e2e-spec.ts`)**: To run the live test, which makes real calls to the Gemini API, you **must** provide a valid `GEMINI_API_KEY`. Create a file named `.test.env` in the project's root directory and add the following line:

    ```
    GEMINI_API_KEY=your_real_api_key_here
    ```

    The `startApp` function will automatically detect and use this key if the `.test.env` file exists.

### Overriding Environment Variables in Tests

For specific test scenarios, you may need to override the default environment variables. The `startApp` function accepts an optional second argument, `envOverrides`, which is a plain JavaScript object containing key-value pairs for the variables you wish to change.

This is particularly useful for testing edge cases or specific configurations, such as lower rate limits for the throttler or different API keys.

**Example:**

To test the application's behaviour with a very low authenticated request limit, you can override the `AUTHENTICATED_THROTTLER_LIMIT` like so:

````typescript
```typescript
describe('My Feature with Custom Env', () => {
  let app: AppInstance;

  beforeAll(async () => {
    const envOverrides = {
      AUTHENTICATED_THROTTLER_LIMIT: '5', // Override default
    };
    app = await startApp('/tmp/my-feature-test.log', envOverrides);
  });

  afterAll(() => {
    stopApp(app.appProcess);
  });

  // Your tests here...
  // e.g. it('should make a request', () => request(app.appUrl).get('/...'));
});
````

The `envOverrides` object is merged with the base test environment, with the overrides taking precedence.

### How to Add a New E2E Test

1.  Create a new file in the `test/` directory with the suffix `.e2e-spec.ts` (e.g., `my-feature.e2e-spec.ts`).
2.  Import the `startApp` and `stopApp` functions from `./utils/app-lifecycle.ts`.
3.  Use `beforeAll` to call `startApp` and retrieve the application process, URL, and any necessary configuration values. If needed, pass an `envOverrides` object.
4.  Use `afterAll` to call `stopApp` to ensure the application process is terminated after the tests complete.
5.  Write your tests using `supertest` to make requests to the `appUrl`.

If your new tests require new environment variables that should apply to _most_ test runs, the best practice is to add them to the default configuration within the `startApp` function in `app-lifecycle.ts`. Use the `envOverrides` feature for scenario-specific changes. Avoid relying on `.test.env` for anything other than the `GEMINI_API_KEY`.
