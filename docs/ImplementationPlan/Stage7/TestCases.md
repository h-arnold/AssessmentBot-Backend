# Stage 7: Detailed Test Cases

This document outlines the specific test cases required to verify the functionality of the structured logging and rate-limiting features.

---

## Part 1: Structured Logging (`logging.e2e-spec.ts`)

**Objective:** Ensure all log outputs are structured, request-aware, and secure.

### Test Suite Setup:

- The test suite must bootstrap a full NestJS application instance.
- It must include a mechanism to capture `process.stdout` during test execution to inspect log output.
- It must use a valid API key from the `ConfigService` for authenticated requests.

### Test Cases:

1.  **Should Output Valid JSON:**
    - **Given:** The application is running.
    - **When:** A request is made to any endpoint.
    - **Then:** The captured `stdout` stream should contain a string that can be successfully parsed as JSON.

2.  **Should Contain Standard Request/Response Fields:**
    - **Given:** A successful request is made.
    - **When:** The request-response cycle completes.
    - **Then:** The corresponding JSON log entry must contain top-level fields for `req` and `res`.
    - **And:** The `req` object must contain `id` (request ID), `method`, and `url`.
    - **And:** The `res` object must contain `statusCode`.
    - **And:** The log entry must contain a `responseTime` field.

3.  **Should Redact Authorization Header:**
    - **Given:** A request is made with an `Authorization: Bearer <api-key>` header.
    - **When:** The request is logged.
    - **Then:** The `req.headers.authorization` field in the JSON log must be redacted (e.g., `"Bearer <key-prefix>..."`) and not contain the full API key.

4.  **Should Propagate Request Context to Injected Loggers:**
    - **Given:** An endpoint that calls a service method (e.g., `ApiKeyService.validate`).
    - **When:** The endpoint is called.
    - **Then:** The log entry for the initial request (e.g., `"request completed"`) and the log entry generated from within the service (e.g., `"API key authentication attempt successful"`) must both contain the exact same `req.id`.

5.  **Should Log Errors with Stack Traces:**
6.  **Should Include ISO-8601 Timestamps:**
    - **Given:** The application is running with default `pinoHttp` configuration.
    - **When:** A request is made to any endpoint.
    - **Then:** Each JSON log entry must include a `timestamp` field formatted as an ISO-8601 string.

7.  **Should Respect LOG_LEVEL Configuration:**
    - **Given:** The `LOG_LEVEL` environment variable is set to `error` (via `ConfigService`).
    - **When:** both info- and error-level logs are emitted during a request.
    - **Then:** Only logs with `level` >= `error` should appear in the captured output.

8.  **Should Handle Large Payloads Without Breaking JSON Output:**
    - **Given:** A request with a very large JSON body (e.g., >1MB) is sent.
    - **When:** The request-response cycle completes.
    - **Then:** The log entry for request and response must still be valid JSON and include truncated payload metadata or body without causing parse errors.
    - **Given:** A request is made to an endpoint that throws an unhandled exception.
    - **When:** The `HttpExceptionFilter` catches the error.
    - **Then:** The corresponding JSON log entry must have a `level` of `"error"`.
    - **And:** The log entry must contain an `err` object with `type`, `message`, and a `stack` trace string.

---

## Part 2: Rate Limiting (`throttler.e2e-spec.ts`)

**Objective:** Ensure the `ApiKeyThrottlerGuard` correctly limits requests based on API key and logs throttled events.

### Test Suite Setup:

- The test suite must bootstrap a full NestJS application with the `ApiKeyThrottlerGuard` enabled globally.
- It must use `ConfigService` to get the configured `THROTTLER_LIMIT` and `THROTTLER_TTL` to run tests dynamically against the configuration.
- It must have access to at least two different, valid API keys.

### Test Cases:

1.  **Should Allow Requests Below Limit:**
    - **Given:** The request limit is `N`.
    - **When:** `N-1` requests are made with the same valid API key.
    - **Then:** All `N-1` responses should have a `2xx` status code.

2.  **Should Reject Requests Exceeding Limit:**
    - **Given:** The request limit is `N`.
    - **When:** `N+1` requests are made with the same valid API key within the TTL window.
    - **Then:** The first `N` requests should succeed, and the `N+1`-th request must be rejected with an HTTP `429 Too Many Requests` status.

3.  **Should Include `Retry-After` Header on Throttled Response:**
    - **Given:** A request is throttled.
    - **When:** The client receives the `429` response.
    - **Then:** The response must include a `Retry-After` header containing the remaining time-to-live (`ttl`) in seconds.

4.  **Should Reset Limit After TTL Expires:**
    - **Given:** An API key has been throttled.
    - **When:** The client waits for the `ttl` duration to pass and then sends another request.
    - **Then:** The new request should succeed with a `2xx` status code.

5.  **Should Throttle Keys Independently:**
    - **Given:** The request limit is `N`, and we have `keyA` and `keyB`.
    - **When:** `N+1` requests are made with `keyA` until it is throttled.
    - **And:** A subsequent request is made with `keyB`.
    - **Then:** The request with `keyB` should succeed with a `2xx` status code.

6.  **Should Fallback to IP Throttling if No Key Provided:**
    - **Given:** The request limit is `N`.
    - **When:** `N+1` requests are made from the same IP address _without_ an API key.
    - **Then:** The `N+1`-th request should be rejected with an HTTP `429` status.

7.  **Should Log Throttled Requests:**
    - **Given:** A request is throttled.
    - **When:** The `ApiKeyThrottlerGuard` rejects the request.
    - **Then:** A structured log message should be emitted with a `warn` level.
    - **And:** The log message must indicate that a request was throttled and include the client's IP and the redacted API key.
