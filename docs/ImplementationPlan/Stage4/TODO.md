# Stage 4: TODO List - Authentication and API Key Guard

## Red Phase: Test-Driven Steps (Write failing tests and stubs)

### 1. AuthModule Unit Tests

- [ ] Create `auth.module.spec.ts` and add tests:
  - [ ] `AuthModule should be defined and importable`
  - [ ] `AuthModule should export ApiKeyStrategy and ApiKeyGuard providers`
  - [ ] `AuthModule should integrate PassportModule correctly`
  - [ ] `AuthModule should register ApiKeyStrategy and ApiKeyGuard in providers and exports`

### 2. ApiKeyStrategy Tests

- [ ] Create `api-key.strategy.spec.ts` and add tests:
  - [ ] `ApiKeyStrategy should validate a correct API key and return user context`
  - [ ] `ApiKeyStrategy should reject an invalid API key`
  - [ ] `ApiKeyStrategy should handle missing API key gracefully`
  - [ ] `ApiKeyStrategy should validate multiple configured API keys`
  - [ ] `ApiKeyStrategy should handle API key format validation (length, character set)`
  - [ ] `ApiKeyStrategy should attach correct user context to request`
  - [ ] `ApiKeyStrategy should load API keys from ConfigService`
  - [ ] `ApiKeyStrategy should log authentication attempts and failures`
  - [ ] `ApiKeyStrategy should log structured authentication attempts and failures without exposing raw API key`

### 3. ApiKeyGuard Tests

- [ ] Create `api-key.guard.spec.ts` and add tests:
  - [ ] `ApiKeyGuard should be properly configured with ApiKeyStrategy`
  - [ ] `ApiKeyGuard should extend AuthGuard with 'bearer' strategy`
  - [ ] `ApiKeyGuard should handle execution context correctly`
  - [ ] `ApiKeyGuard should preserve request context in authentication failures`

### 4. Configuration Integration Tests

- [ ] Update `config.service.spec.ts` to include API key validation:
  - [ ] `ConfigService should validate API_KEYS environment variable`
  - [ ] `ConfigService should reject malformed API keys at startup`
  - [ ] `ConfigService should support multiple comma-separated API keys`
  - [ ] `ConfigService should fail gracefully on missing API_KEYS`

### 5. E2E Authentication Tests

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

---

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

---

## Blue Phase: Security Hardening and Optimization

### 16. Security Enhancements

- [ ] Implement constant-time comparison for API key validation
- [ ] Add rate limiting specifically for authentication attempts
- [ ] Ensure API keys are not logged in plain text
- [ ] Implement secure headers for authentication responses

### 17. Performance Optimization

- [ ] Cache validated API keys to reduce repeated validations
- [ ] Optimize API key lookup for multiple keys
- [ ] Add performance metrics for authentication operations

### 18. Error Handling Refinement

- [ ] Ensure all authentication errors provide appropriate detail levels
- [ ] Verify no sensitive information leaks in error responses
- [ ] Test edge cases: empty strings, null values, malformed headers

---

## Notes

### Security Considerations

- **API Key Storage**: Keys should be stored securely in environment variables, never in code
- **Logging**: Authentication attempts should be logged for security monitoring, but API keys themselves must never appear in logs
- **Error Messages**: Provide consistent error messages that don't leak information about valid/invalid key formats
- **Rate Limiting**: Consider implementing rate limiting on authentication attempts to prevent brute force attacks

### Testing Strategy

- Use NestJS testing utilities (`TestingModule`, `Test.createTestingModule`)
- Mock `ConfigService` in unit tests to provide test API keys
- Use Supertest for E2E authentication flow testing
- Test both positive and negative authentication scenarios
- Verify integration with existing `HttpExceptionFilter` from Stage 3

### Environment Configuration

- Support multiple API keys via comma-separated values
- Validate key format at application startup
- Fail fast on missing or malformed API key configuration
- Provide clear error messages for configuration issues

### Integration Points

- `ConfigService` for API key retrieval
- `HttpExceptionFilter` for consistent error formatting
- `PassportModule` for authentication strategy implementation
- NestJS `Logger` for structured authentication logging

### API Key Format Requirements

- Minimum length: 32 characters
- Character set: alphanumeric + special characters
- No whitespace allowed
- Case-sensitive validation
