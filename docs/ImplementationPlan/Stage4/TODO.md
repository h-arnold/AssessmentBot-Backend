# Stage 4: TODO List - Authentication and API Key Guard

**Overview & Approach**
Below is a guided, step-by-step process for implementing and testing API key authentication. Follow each numbered phase carefully. If anything feels confusing, re-read these instructions or ask for clarification.

1. ApiKeyService Design & Testing
   - Create `ApiKeyService` to encapsulate all raw API-key logic: loading from environment, validating format, and matching keys.
   - Write unit tests for every scenario (valid key, invalid key, missing key, multiple keys, format rules).
   - Mock `ConfigService` and `Logger` so tests only focus on your service logic.

2. ApiKeyStrategy Delegation
   - Scaffold `ApiKeyStrategy` that injects your service and simply calls `service.validate(token)`.
   - Unit-test that the strategy correctly delegates successes and throws `UnauthorizedException` on failures.
   - Do not re-test key parsing or lookup here—that’s covered in the service tests.

3. ApiKeyGuard Configuration
   - Implement `ApiKeyGuard` by extending Nest’s `AuthGuard('bearer')` so it uses your strategy.
   - Write a few shallow tests to confirm the guard class is set up correctly and passes execution context through.
   - Avoid deep Passport internals—only assert class configuration and error propagation.

4. End-to-End Integration
   - Use SuperTest to spin up a minimal Nest application with your guard on a protected endpoint.
   - Test real HTTP flows: missing key, bad key, good key, edge-case headers, and verify consistent error JSON from your global filter.
   - Cover unprotected routes (like `/health`) still work without a key.

5. Phased Workflow
   - **Red Phase**: Write failing tests and stubs first (sections 1–4). Run tests and watch them fail.
   - **Green Phase**: Implement minimal code to make each test pass.
   - Only move to the next item once all tests in the current item pass.

## Red Phase: Test-Driven Steps (Write failing tests and stubs)

### 1. AuthModule Unit Tests

- [ ] Create `auth.module.spec.ts` and add tests:
  - [ ] `AuthModule should be defined and importable`
  - [ ] `AuthModule should export ApiKeyStrategy and ApiKeyGuard providers`
  - [ ] `AuthModule should integrate PassportModule correctly`
  - [ ] `AuthModule should register ApiKeyStrategy and ApiKeyGuard in providers and exports`

### 2. ApiKeyService Tests

- [ ] Create `api-key.service.spec.ts` and add tests:
  - [ ] `ApiKeyService.validate should accept a valid API key and return user context`
  - [ ] `ApiKeyService.validate should reject an invalid API key`
  - [ ] `ApiKeyService.validate should handle missing API key gracefully`
  - [ ] `ApiKeyService.validate should support multiple configured API keys`
  - [ ] `ApiKeyService.validate should enforce API key format (length, character set)`
  - [ ] `ApiKeyService.validate should load API keys from ConfigService`
  - [ ] `ApiKeyService.validate should log structured authentication attempts without exposing raw API key`

### 3. ApiKeyStrategy Tests (delegation)

- [ ] Create `api-key.strategy.spec.ts` and add tests:
  - [ ] `ApiKeyStrategy should be defined and inject ApiKeyService`
  - [ ] `ApiKeyStrategy.validate should call ApiKeyService.validate and return the user context`
  - [ ] `ApiKeyStrategy.validate should throw UnauthorizedException when service rejects`
  - [ ] `ApiKeyStrategy should log delegation events appropriately`
  - [ ] No direct key-format or lookup logic here (covered in service tests)

### 4. ApiKeyGuard Tests

- [ ] Create `api-key.guard.spec.ts` and add tests:
  - [ ] `ApiKeyGuard should be properly configured with ApiKeyStrategy`
  - [ ] `ApiKeyGuard should extend AuthGuard with 'bearer' strategy`
  - [ ] `ApiKeyGuard should handle execution context correctly`
  - [ ] `ApiKeyGuard should preserve request context in authentication failures`

### 5. Configuration Integration Tests

- [ ] Update `config.service.spec.ts` to include API key validation:
  - [ ] `ConfigService should validate API_KEYS environment variable`
  - [ ] `ConfigService should reject malformed API keys at startup`
  - [ ] `ConfigService should support multiple comma-separated API keys`
  - [ ] `ConfigService should fail gracefully on missing API_KEYS`

### 6. E2E Authentication Tests

- [ ] Create `auth.e2e-spec.ts` and add tests:
  - [ ] `Protected route without API key returns 401 Unauthorized`
  - [ ] `Protected route with invalid API key returns 401 Unauthorized`
  - [ ] `Protected route with valid API key returns 200 OK`
  - [ ] `Unprotected routes remain accessible without API key`
  - [ ] `Unauthorized responses use consistent error format from HttpExceptionFilter`
  - [ ] `Malformed Authorization header returns 401 Unauthorized`
  - [ ] `Empty Authorization header returns 401 Unauthorized`
  - [ ] `API key validation is case-sensitive`
  - [ ] `API key validation handles whitespace correctly`
  - [ ] `/health endpoint remains accessible without authentication`
  - [ ] `Protected route with valid API key returns 200 OK and includes user context in response`

--- Previous Attempt Notes ---

**Status:** Reverted to a clean state after encountering significant issues with mocking `AuthGuard` and `Logger` in unit tests. All tests are currently passing after reverting to commit `b363af8` and fixing a test case in `src/common/json-parser.util.spec.ts` (commit: `b107bbf`).

**Issues Encountered:**

1.  **Mocking Complexity for `AuthGuard`:** Directly mocking `AuthGuard` and its internal dependencies (like `PassportStrategy` and `ExecutionContext`) proved to be overly complex and brittle. Changes to the `AuthGuard` implementation or its dependencies frequently broke the mocks, leading to time-consuming debugging of test setups rather than actual logic.
2.  **Logger Injection:** Initially, `ApiKeyStrategy` created its own `Logger` instance, making it difficult to mock and verify logging behavior in unit tests. While this was addressed by injecting `Logger`, the overall mocking strategy for authentication components remained challenging.
3.  **Interdependencies:** The tight coupling between `AuthModule`, `ApiKeyStrategy`, and `ApiKeyGuard`, combined with NestJS's dependency injection, made isolated unit testing difficult without extensive and fragile mocking.

**Revised Testing Strategy Consideration:**
Given the difficulties with extensive mocking for `AuthGuard`, a more pragmatic approach for testing the authentication flow might involve a hybrid strategy:

- **Unit Tests for `ApiKeyStrategy` (focused on `validate` method):** Continue with unit tests for `ApiKeyStrategy` to ensure its `validate` method correctly processes API keys against the `ConfigService` and handles various valid/invalid scenarios. Mock `ConfigService` and `Logger` for these tests.
- **E2E Tests for `ApiKeyGuard` and Authentication Flow:** Instead of heavily mocking `AuthGuard` in unit tests, rely more on end-to-end (E2E) tests to verify the `ApiKeyGuard`'s behavior. This involves:
  - Setting up a minimal NestJS application with the `AuthModule` and a protected endpoint.
  - Using `supertest` to make actual HTTP requests to this protected endpoint.
  - Providing valid/invalid API keys via `Authorization` headers.
  - Asserting on the HTTP status codes (e.g., 200 OK, 401 Unauthorized) and response bodies.
  - This approach tests the entire authentication pipeline (Passport.js integration, strategy, guard, and `HttpExceptionFilter`) as a whole, reducing the need for complex and fragile mocks.

**Next Steps:**
I will proceed with creating the `src/auth` directory and the initial test files as per the TODO list, but with a stronger emphasis on E2E tests for `ApiKeyGuard` and the overall authentication flow, and simpler unit tests for `ApiKeyStrategy`.

--- End Previous Attempt Notes ---

## Green Phase: Implementation and Verification (Make tests pass)

### 6. Install Dependencies

- [ ] Install Passport.js dependencies:
  ```bash
  npm install @nestjs/passport passport passport-http-bearer
  npm install -D @types/passport @types/passport-http-bearer
  ```

### 7. Create AuthModule Structure

- [ ] Create the directory `src/auth`

- [ ] Scaffold `AuthModule` in `src/auth/auth.module.ts`:
  - Import `PassportModule` from `@nestjs/passport`
  - Provide and export `ApiKeyStrategy` and `ApiKeyGuard`
  - Import `ConfigModule` for accessing environment variables

### 8. Implement ApiKeyStrategy

- [ ] Implement `ApiKeyStrategy` in `src/auth/api-key.strategy.ts`:
  - Extend `PassportStrategy` with `Strategy` from `passport-http-bearer`
  - Inject `ConfigService` to access API keys from environment
  - Implement `validate(token: string)` method
  - Handle multiple API keys (comma-separated in env var)
  - Log authentication attempts with IP and timestamp (using NestJS Logger)
  - Return user context object for successful authentication
  - Throw `UnauthorizedException` for invalid keys
  - Validate API key format (minimum length, character set)

### 9. Implement ApiKeyGuard

- [ ] Implement `ApiKeyGuard` in `src/auth/api-key.guard.ts`:
  - Extend `AuthGuard('bearer')` from `@nestjs/passport`
  - Handle execution context appropriately
  - Provide clear error messages for authentication failures
  - Preserve request context for logging in HttpExceptionFilter

### 10. Update Configuration Schema

- [ ] Update `src/config/config.service.ts`:
  - Add `API_KEYS` to the Zod environment schema
  - Validate API key format during application startup
  - Support comma-separated multiple keys
  - Provide getter method for API keys array
  - Add validation for minimum key length and format requirements

### 11. Create Protected Test Endpoint

- [ ] Add a protected test endpoint to `src/app.controller.ts`:
  - Create `@Get('protected')` endpoint decorated with `@UseGuards(ApiKeyGuard)`
  - Return a simple response to verify authentication works
  - Include user context from successful authentication in response

### 12. Integration Setup

- [ ] Update `src/app.module.ts`:
  - Add `AuthModule` to the imports array
  - Ensure proper module dependency order

- [ ] Verify `main.ts` configuration:
  - Ensure global `HttpExceptionFilter` handles `UnauthorizedException` correctly
  - No additional global setup required for guards (applied per route)

### 13. Environment Configuration

- [ ] Update `.env.example`:
  - Add `API_KEYS` example with multiple comma-separated keys
  - Include format requirements and security notes in comments
  - Provide guidance on key generation and rotation

### 14. Documentation

- [ ] Create `docs/auth/API_Key_Management.md`:
  - Document API key generation best practices
  - Explain key rotation procedures
  - Provide examples of API key usage in requests
  - Include security considerations and rate limiting recommendations
  - Document the authorization header format: `Authorization: Bearer <api-key>`

### 15. Verification and Testing

- [ ] Run all tests and ensure Stage 4 tests pass:

  ```bash
  npm test
  npm run test:e2e
  ```

- [ ] Verify integration with existing modules:
  - Test that ConfigModule, CommonModule, and AuthModule work together
  - Ensure no conflicts with existing global filters and pipes
  - Verify authentication logs appear in structured format

- [ ] Manual verification:
  - Start dev server with valid API keys in environment
  - Test protected endpoints with curl/Postman
  - Verify error responses match expected format
  - Test authentication with multiple configured keys

--- End of content ---
