# Stage 3 Test Cases - Common Utilities and Error Handling

This document outlines the comprehensive test cases for Stage 3 of the Assessment Bot Backend implementation, focusing on the red phase of TDD where we write failing tests first.

## Overview

Stage 3 implements the `CommonModule` to provide shared utilities and global exception/validation handling:

- `HttpExceptionFilter` for consistent error serialization
- `ZodValidationPipe` for request payload validation
- `JsonParserUtil` for parsing and repairing JSON
- Global setup in `main.ts` to apply filters and pipes

## Test Categories

### 1. CommonModule Unit Tests

#### 1.1 Module Creation and Registration

- [x] **Test**: `CommonModule should be defined and importable`
  - Verify the module class exists and can be imported
  - Ensure the module is decorated with `@Module()`

- [x] **Test**: `CommonModule should export shared providers`
  - Verify `HttpExceptionFilter`, `ZodValidationPipe`, and `JsonParserUtil` are provided and exportable
  - Ensure other modules can inject these services

### 2. HttpExceptionFilter Tests

#### 2.1 Core Filter Behavior

- [x] **Test**: `HttpExceptionFilter should format custom error response with timestamp, path, and sanitized message`
  - Simulate throwing `new HttpException('Error occurred', 400)` in a controller
  - Expect JSON response with properties: `statusCode`, `message`, `timestamp`, `path`

- [x] **Test**: `HttpExceptionFilter should preserve request context in structured logs and use correct log level (warn for 4xx, error for 5xx)`
  - Mock request with headers, IP address, user agent, and other context
  - Verify logged errors include request method, path, IP, headers, and user agent
  - Test that sensitive headers (Authorization, API keys) are masked in logs

#### 2.2 Logging Integration

- [x] **Test**: `HttpExceptionFilter should log errors with structured format`
  - Mock NestJS Logger and verify error logging occurs
  - Expect log entries to include: timestamp, level, message, stack trace, request context

- [x] **Test**: `HttpExceptionFilter should log different levels based on error type`
  - 4xx errors should log at 'warn' level
  - 5xx errors should log at 'error' level
  - Verify appropriate log level is used for each exception type

#### 2.3 Integration Test

- [x] **Test**: `Global filter should be applied in main.ts`
  - Boot the application with filter registered globally
  - Call an endpoint that throws an exception; verify response format matches filter logic

### 3. ZodValidationPipe Tests

#### 3.1 Validation Behavior

- [x] **Test**: `ZodValidationPipe should throw BadRequestException on invalid data`
  - Define Zod schema for a simple DTO (e.g., `{ name: string().min(1) }`)
  - Pass invalid payload to pipe and expect a `BadRequestException` with validation errors

- [x] **Test**: `ZodValidationPipe should return transformed data on valid payload`
  - Pass valid payload matching schema; expect returned value correctly typed and transformed

- [x] **Test**: `ZodValidationPipe should handle nested validation schemas`
  - Define complex nested Zod schema with multiple validation rules
  - Test both valid and invalid nested payloads

- [x] **Test**: `ZodValidationPipe should handle edge cases for empty and null values`
  - Test with empty payloads: `{}`, `null`, `undefined`
  - Test with empty strings, empty arrays, and empty objects
  - Verify appropriate validation responses for each edge case

- [x] **Test**: `ZodValidationPipe should handle array validation scenarios`
  - Test with array schemas containing various validation rules
  - Test with empty arrays, arrays with invalid items, and mixed valid/invalid arrays
  - Verify error messages specify which array items failed validation

#### 3.2 Error Response Consistency

- [x] **Test**: `ZodValidationPipe should format validation errors consistently`
  - Test with multiple validation failures
  - Verify error response matches NestJS standard format with detailed field-level errors

- [x] **Test**: `ZodValidationPipe should sanitize validation error messages`
  - Include potentially sensitive data in validation schema
  - Verify error messages don't expose internal schema details

#### 3.3 Controller Integration

- [x] **Test**: `Controller endpoint should return 400 for invalid payload`
  - Use Supertest to POST invalid JSON to an endpoint using the pipe
  - Expect 400 response with details of which fields failed validation

- [x] **Test**: `Controller endpoint should process valid payload successfully`
  - POST valid data; expect 200 OK and correct response body

#### 3.4 Logging Integration

- [x] **Test**: `ZodValidationPipe should log validation failures`
  - Mock NestJS Logger and verify validation failure logging
  - Expect log entries to include request details and validation errors

#### 3.5 Integration Test

- [x] **Test**: `Global pipe should be applied in main.ts`
  - Boot the application with the pipe registered globally
  - Call an endpoint with an invalid payload and verify the response format matches the pipe's error structure

### 4. JsonParserUtil Tests

#### 4.1 Integration Smoke Tests

- [ ] **Test**: `JsonParserUtil should parse or repair valid and mildly malformed JSON strings using jsonrepair` (Blocked: `jsonrepair` library could not be installed)
  - Mock the `jsonrepair` library import
  - Provide malformed JSON and verify the library is called correctly
  - Expect successful parsing after repair

- [x] **Test**: `JsonParserUtil should handle circular reference scenarios`
  - Note: This test was removed as the `jsonrepair` library is designed to repair syntactically incorrect JSON, not to validate semantic issues like circular references. The library correctly parses the provided string, and `JSON.stringify` itself throws an error when encountering circular references in objects.

- [x] **Test**: `JsonParserUtil should throw BadRequestException for irreparable JSON`
  - Provide a fundamentally broken JSON string
  - Expect a custom `UnparseableJsonResponseException` to be thrown

#### 4.2 Error Handling and Logging

- [x] **Test**: `JsonParserUtil should log parsing attempts and failures`
  - Mock NestJS Logger and verify logging occurs during parsing
  - Expect log entries for both successful repairs and failures

- [x] **Test**: `JsonParserUtil should throw error on unrepairable JSON`
  - Provide completely invalid JSON; expect thrown error indicating parse failure
  - Verify error includes original malformed input for debugging (in non-production)

### 5. Global Setup Integration Tests

#### 5.1 Main.ts Configuration

- [x] **Test**: `Application should register global pipe and filter`
  - Inspect Nest application metadata or perform an E2E call
  - Verify that `ZodValidationPipe` and `HttpExceptionFilter` are active globally

#### 5.2 Error Response Integration

- [x] **Test**: `Global error handling should produce consistent responses across all endpoints`
  - Test multiple endpoints with different error types
  - Verify all responses follow the same error format structure

- [x] **Test**: `Global validation and exception handling should work together`
  - Send invalid payload to trigger validation pipe
  - Verify exception filter properly formats the validation error response

#### 5.3 Logging Integration

- [x] **Test**: `Global setup should enable structured logging across all utilities`
  - Mock NestJS Logger globally
  - Trigger various error scenarios and verify consistent log format across utilities

- [x] **Test**: `CommonModule should integrate properly with existing ConfigModule`
  - Verify CommonModule works correctly when imported alongside ConfigModule
  - Test that configuration-dependent behavior works as expected
  - Ensure no conflicts between Stage 2 and Stage 3 implementations

### 6. Security and Performance Tests

#### 6.1 Security Validation

- [x] **Test**: `Error responses should not expose sensitive information`
  - Test with various error scenarios including database errors, file system errors
  - Verify error messages are sanitized for production use

- [ ] **Test**: `Large payload validation should not cause memory issues` (Not Implemented)
  - Send very large JSON payloads to validation pipe
  - Verify graceful handling without memory leaks

- [ ] **Test**: `Error responses should handle various sensitive information scenarios` (Not Implemented)
  - Test with database connection errors, file system errors, API key leaks
  - Test with internal server paths, configuration values, and stack traces
  - Verify all sensitive information is properly masked based on environment
  - Test with custom error messages that might contain sensitive data

#### 6.2 Performance Testing

- [ ] **Test**: `JsonParserUtil should handle large JSON strings efficiently` (Not Implemented)
  - Test with JSON strings of various sizes (1KB, 10KB, 100KB)
  - Verify reasonable parsing time and memory usage

- [ ] **Test**: `ZodValidationPipe should validate complex schemas efficiently` (Not Implemented)
  - Test with deeply nested schemas and large arrays
  - Verify validation completes within acceptable time limits

### 7. Library Integration Tests

#### 7.1 jsonrepair Library

- [ ] **Test**: `jsonrepair library should be properly imported and accessible` (Blocked: `jsonrepair` library could not be installed)
  - Verify the library is correctly installed and can be imported
  - Test basic functionality of the library directly

- [ ] **Test**: `JsonParserUtil should handle all jsonrepair supported scenarios` (Blocked: `jsonrepair` library could not be installed)
  - Test various malformed JSON types that jsonrepair can fix
  - Verify comprehensive coverage of library capabilities

#### 7.2 Zod Library Integration

- [x] **Test**: `ZodValidationPipe should leverage full Zod validation capabilities`
  - Test with various Zod schema types (strings, numbers, arrays, objects)
  - Verify advanced Zod features like transforms and refinements work correctly

- [x] **Test**: `Zod error messages should be properly formatted for end users`
  - Test with various validation failures
  - Verify error messages are user-friendly and actionable

## Success Criteria

- All tests fail initially (red phase).
- Tests clearly define expected behavior for utilities and global handling.
- Tests cover both happy path and error scenarios for each feature.
- Validation and exception handling adhere to security and modularity principles.
- Error responses follow consistent NestJS standard format across all utilities.
- Structured logging is implemented and verified for all error scenarios.
- Library integrations (jsonrepair, Zod) are properly tested and validated.
- Security considerations are addressed through input sanitization and safe error messaging.
