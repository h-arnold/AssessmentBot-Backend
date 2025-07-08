# Stage 2 Test Cases - Configuration and Environment Management

This document outlines the comprehensive test cases for Stage 2 of the Assessment Bot Backend implementation, focusing on the red phase of TDD where we write failing tests first.

## Overview

Stage 2 implements the `ConfigModule` with Zod-based validation for environment variables. At this stage, we focus on foundational configuration infrastructure rather than complete application configuration.

## Test Categories

### 1. ConfigModule Unit Tests

#### 1.1 Module Creation and Registration

- [X] **Test**: `ConfigModule should be defined and importable`
  - Verify the module class exists and can be imported
  - Ensure the module is properly decorated with `@Module()`

- [X] **Test**: `ConfigModule should export configuration service`
  - Verify that ConfigService is provided and exportable
  - Ensure other modules can inject the configuration service

#### 1.2 Environment Variable Loading

- [X] **Test**: `ConfigModule should load environment variables from process.env`
  - Mock process.env with test values
  - Verify variables are accessible through ConfigService

- [X] **Test**: `ConfigModule should load environment variables from .env file`
  - Create temporary .env file with test values
  - Verify variables are loaded when process.env is empty
  - Clean up temporary files after test

- [X] **Test**: `ConfigModule should prioritize process.env over .env file`
  - Set same variable in both process.env and .env file with different values
  - Verify process.env value takes precedence

### 2. Zod Validation Schema Tests

#### 2.1 Required Environment Variables

- [X] **Test**: `Validation should fail when NODE_ENV is missing`
  - Remove NODE_ENV from environment
  - Expect ZodError to be thrown during module initialization

- [X] **Test**: `Validation should fail when PORT is missing`
  - Remove PORT from environment
  - Expect ZodError to be thrown during module initialization

- [X] **Test**: `Validation should pass with valid NODE_ENV values`
  - Test with 'development', 'production', 'test'
  - Verify each value is accepted

- [X] **Test**: `Validation should fail with invalid NODE_ENV values`
  - Test with 'invalid', '', null, undefined
  - Expect ZodError for each invalid value

#### 2.2 Data Type Validation

- [X] **Test**: `PORT should be validated as a number`
  - Test with valid numeric strings ('3000', '8080')
  - Test with invalid values ('abc', '', 'port')
  - Verify numeric conversion works correctly

- [X] **Test**: `PORT should be within valid range`
  - Test with ports below 1024 (should fail in production)
  - Test with valid ports (3000-8080 range)

#### 2.3 Schema Defaults and Optional Values

- [X] **Test**: `APP_NAME should return default value when not set`
  - Unset `APP_NAME` in the environment
  - Verify `ConfigService` returns the default value 'AssessmentBot-Backend'

- [X] **Test**: `APP_VERSION should be optional`
  - Unset `APP_VERSION` in the environment
  - Verify that validation passes and the value is `undefined`

### 3. ConfigService Unit Tests

- [X] **Test**: `ConfigService should return validated values with correct types`
  - Set `PORT` to a string value like `'3000'`
  - Verify that `ConfigService.get('PORT')` returns a `number`

### 6. Environment File Tests

#### 6.1 .env.example File

- [X] **Test**: `.env.example should contain all required variables`
  - Parse .env.example file
  - Compare with Zod schema required fields
  - Verify all required variables are documented

- [X] **Test**: `.env.example should use placeholder values`
  - Verify no real secrets or production values
  - Check that example values follow expected format
  - Ensure comments explain purpose of each variable

#### 6.2 Environment Loading Priority

- [X] **Test**: `Process environment should override .env file`
  - Create .env with test values
  - Set different values in process.env
  - Verify process.env values are used

- [X] **Test**: `Missing .env file should not cause an error`
  - Ensure no `.env` file is present
  - Verify that the `ConfigModule` initializes without throwing an error

- [X] **Test**: `Missing .env file should not cause errors`
  - Remove .env file
  - Set required variables in process.env
  - Verify application starts successfully

## Minimal Configuration Schema for Stage 2

For Stage 2, the configuration schema should include only essential variables:

```typescript
// Expected Zod schema structure for Stage 2
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_NAME: z.string().default('AssessmentBot-Backend'),
  APP_VERSION: z.string().optional(),
});
```

## Test Execution Strategy

1. **Unit Tests**: Focus on individual components (ConfigModule, validation functions)
2. **Integration Tests**: Test module interactions and application bootstrap
3. **E2E Tests**: Verify complete application startup scenarios

## Success Criteria

- All tests fail initially (red phase)
- Tests clearly define expected behavior
- Tests cover both happy path and error scenarios
- Tests validate the security principle of input validation
- Tests ensure application fails fast with clear error messages

## Future Considerations

As the project progresses through later stages, additional configuration categories will be added:

- Authentication settings (Stage 4)
- LLM service configuration (Stage 6)
- Logging configuration (Stage 8)
- Rate limiting settings (Stage 8)

The test suite should be designed to accommodate these additions without requiring major refactoring.
