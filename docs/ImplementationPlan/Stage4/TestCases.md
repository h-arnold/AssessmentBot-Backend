# Stage 4 Test Cases - Authentication and API Key Guard

This document outlines the comprehensive test cases for Stage 4 of the Assessment Bot Backend implementation, focusing on API key authentication and guarding protected routes.

## Overview

Stage 4 implements the `AuthModule` to secure endpoints using API keys via Passport.js:

- `ApiKeyStrategy` for validating API keys
- `ApiKeyGuard` for protecting routes
- Integration of guards on selected endpoints

## Test Categories

### 1. AuthModule Unit Tests

#### 1.1 Module Creation and Registration

- [x] **Test**: `AuthModule` should be defined and importable
  - Verify the module class exists and is decorated with `@Module()`
  - Ensure `ApiKeyStrategy` and `ApiKeyGuard` are listed in providers and exports

- [x] **Test**: `AuthModule` should register `ApiKeyStrategy` and `ApiKeyGuard` in its providers and exports

#### 1.2 ApiKeyService Tests

- [x] **Test**: `ApiKeyService.validate` should accept a valid API key and return user context
  - Mock `ConfigService` and verify service returns expected payload for valid key

- [x] **Test**: `ApiKeyService.validate` should reject an invalid API key
  - Verify service throws `UnauthorizedException` or similar on bad key

- [x] **Test**: `ApiKeyService.validate` should handle missing API key gracefully
  - Verify service rejects undefined or empty tokens

- [x] **Test**: `ApiKeyService.validate` should support multiple configured API keys
  - Test acceptance of all valid keys from comma-delimited config

- [x] **Test**: `ApiKeyService.validate` should enforce API key format (length, character set)
  - Verify malformed keys are rejected pre-lookup

- [x] **Test**: `ApiKeyService.validate` should load API keys from `ConfigService`
  - Mock environment loading and verify keys array is read correctly

- [x] **Test**: `ApiKeyService.validate` should log structured authentication attempts without exposing raw API key
  - Inspect calls to injected `Logger` for correct structure

#### 1.3 ApiKeyStrategy Tests (delegation)

- [x] **Test**: `ApiKeyStrategy` should be defined and inject `ApiKeyService`

- [x] **Test**: `ApiKeyStrategy.validate` should call `ApiKeyService.validate` and return user context

- [x] **Test**: `ApiKeyStrategy.validate` should throw `UnauthorizedException` when service rejects

- [x] **Test**: `ApiKeyStrategy` should log delegation events appropriately

- [ ] Note: key-format and lookup logic is tested in `ApiKeyService` tests

#### 1.4 ApiKeyGuard Tests

- [x] **Test**: `ApiKeyGuard` should be properly configured with ApiKeyStrategy
  - Verify the guard is correctly set up to use the 'bearer' strategy
  - Test that the guard class extends the appropriate NestJS AuthGuard

#### 1.4 API Key Configuration Tests

- [ ] **Test**: API keys should be loaded from environment variables
  - Verify that the strategy reads API keys from the ConfigService/environment variables

- [ ] **Test**: Application should fail to start with missing API key configuration
  - Test that missing required API key environment variables prevent application startup

- [ ] **Test**: Application should validate API key format at startup
  - Test that malformed API keys in configuration are rejected during application initialization

### 2. Integration (E2E) Tests

#### 2.1 Protected Routes

- [ ] **Test**: Request to a protected route without an API key returns `401 Unauthorized`
  - Use Supertest to call an endpoint decorated with `@UseGuards(ApiKeyGuard)` and assert a 401 response

- [ ] **Test**: Request to a protected route with an invalid API key returns `401 Unauthorized`
  - Send `Authorization: Bearer invalid-key` header and verify the response

- [ ] **Test**: Request to a protected route with a valid API key returns `200 OK`
  - Send `Authorization: Bearer <valid-key>` and verify the response payload

- [ ] **Test**: Request to a protected route with a valid API key returns `200 OK` and includes authenticated user context in the response body

#### 2.2 Unprotected Routes

- [ ] **Test**: `GET /` (or other public endpoint) remains accessible without an API key
  - Call a non-protected endpoint and expect a `200 OK` response

#### 2.3 Error Response Format

- [ ] **Test**: Unauthorized responses use the consistent error format from `HttpExceptionFilter`
  - Trigger a 401 error and verify the JSON response body matches the defined structure: `{ "statusCode": 401, "message": "Unauthorized", "timestamp": "...", "path": "..." }`

#### 2.4 Header Format and Edge Cases

- [ ] **Test**: Request with malformed Authorization header returns `401 Unauthorized`
  - Send headers like `Authorization: invalid-format` or `Authorization: Bearer` (without key) and verify 401 response

- [ ] **Test**: Request with empty Authorization header returns `401 Unauthorized`
  - Send `Authorization: Bearer ` (with just spaces) and verify proper error handling

- [ ] **Test**: API key validation is case-sensitive
  - If keys are configured as case-sensitive, verify that `Bearer ABC123` fails when valid key is `abc123`

- [ ] **Test**: API key validation trims whitespace
  - Verify that `Bearer  abc123  ` (with extra spaces) is handled correctly

### 3. Compatibility Tests

#### 3.1 Health Endpoint

- [ ] **Test**: `/health` endpoint response format remains unchanged and accessible without a key
  - Validate the schema of the response: `{ status: string, version: string }`

#### 3.2 CommonModule Integration

- [ ] **Test**: `HttpExceptionFilter` from `CommonModule` correctly handles `UnauthorizedException` thrown by the `ApiKeyGuard`
  - This is implicitly covered by test `2.3` but serves as a specific check on the integration between `AuthModule` and `CommonModule`.
