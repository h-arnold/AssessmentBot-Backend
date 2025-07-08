# Stage 3: TODO List

## Red Phase: Test-Driven Steps (Write failing tests and stubs)

1. CommonModule Unit Tests
   - [ ] Create `common.module.spec.ts` and add tests:
     - [ ] `CommonModule should be defined and importable`
     - [ ] `CommonModule should export shared providers (HttpExceptionFilter, ZodValidationPipe, JsonParserUtil)`

2. HttpExceptionFilter Tests
   - [ ] Create `http-exception.filter.spec.ts` and add tests:
     - [ ] `HttpExceptionFilter should format custom error response with timestamp and path`
     - [ ] `HttpExceptionFilter should sanitize sensitive messages in production`
     - [ ] `HttpExceptionFilter should include request context (method, path, IP, headers) in logs`
     - [ ] `HttpExceptionFilter should use warn level for 4xx errors and error level for 5xx errors`

3. ZodValidationPipe Tests
   - [ ] Create `zod-validation.pipe.spec.ts` and add tests:
     - [ ] `ZodValidationPipe should throw BadRequestException on invalid data`
     - [ ] `ZodValidationPipe should return transformed data on valid payload`
     - [ ] `ZodValidationPipe should handle edge cases for empty and null values`
     - [ ] `ZodValidationPipe should handle array validation scenarios`
     - [ ] `ZodValidationPipe should log validation failures`

4. JsonParserUtil Tests
   - [ ] Create `json-parser.util.spec.ts` and add tests:
     - [ ] `JsonParserUtil should successfully parse a valid JSON string`
     - [ ] `JsonParserUtil should repair and parse a malformed JSON string`
     - [ ] `JsonParserUtil should handle circular reference scenarios`
     - [ ] `JsonParserUtil should handle various JSON edge cases (deep nesting, special characters, Unicode)`
     - [ ] `JsonParserUtil should throw a BadRequestException for irreparable JSON`

5. Global Setup and E2E Tests
   - [ ] Create `main.e2e-spec.ts` to verify global setups:
     - [ ] `Global HttpExceptionFilter should catch an exception thrown from a test controller`
     - [ ] `Global ZodValidationPipe should validate a request DTO and reject invalid data`
     - [ ] `CommonModule should integrate properly with existing ConfigModule`

---

## Green Phase: Implementation and Verification (Make tests pass)

- [ ] Create the directory `src/common`

- [ ] Scaffold `CommonModule` in `src/common/common.module.ts`:
  - Provide and export `HttpExceptionFilter`, `ZodValidationPipe`, and `JsonParserUtil`

- [ ] Implement `HttpExceptionFilter` in `src/common/http-exception.filter.ts`:
  - Catch `HttpException` and generic `Error`
  - Integrate NestJS `Logger` for structured logs (use `warn` for 4xx, `error` for 5xx)
  - Sanitize error messages in production environments
  - Handle environment-specific behavior (NODE_ENV-based sanitization)
  - Preserve request context in logs (IP, headers, user agent)
  - Support additional NestJS exception types comprehensively

- [ ] Implement `ZodValidationPipe` in `src/common/zod-validation.pipe.ts`:
  - Accept a Zod schema in the constructor
  - Transform and return valid data, and throw `BadRequestException` for invalid data
  - Handle edge cases for empty and null values
  - Support array validation scenarios with detailed error messages
  - Log validation failures

- [ ] Implement `JsonParserUtil` in `src/common/json-parser.util.ts`:
  - Add `json-repair` as a dependency: `npm install --save json-repair`
  - Use `json-repair` to parse potentially malformed JSON
  - Handle circular reference scenarios
  - Support various JSON edge cases (deep nesting, special characters, Unicode)
  - Throw `BadRequestException` if JSON is irreparable

- [ ] Update `main.ts` in the `src` directory:
  - Register global filter: `app.useGlobalFilters(new HttpExceptionFilter());`
  - Register global pipe: `app.useGlobalPipes(new ZodValidationPipe());`

- [ ] Add `CommonModule` to the `imports` array in `src/app.module.ts`

- [ ] Verify integration with existing ConfigModule:
  - Ensure CommonModule works correctly when imported alongside ConfigModule
  - Test that configuration-dependent behavior works as expected
  - Verify no conflicts between Stage 2 and Stage 3 implementations

- [ ] Run all tests (`npm test`) and ensure all Stage 3 tests pass without errors

---

## Notes

- Ensure test files are located alongside their implementation counterparts under `src/common` or in a `test` directory following project conventions.
- Use NestJS testing utilities (`TestingModule`, `Test.createTestingModule`) and Supertest for integration and E2E tests.
- Follow existing coding standards and linting configurations.
- **Environment-specific behavior**: Implement NODE_ENV-based error sanitization (detailed errors in development, sanitized in production).
- **Request context preservation**: Ensure all logging includes request context (IP, headers, user agent) while masking sensitive information.
- **Edge case handling**: Pay special attention to null/undefined values, empty payloads, and circular references.
- **Integration testing**: Verify CommonModule works seamlessly with existing ConfigModule without conflicts.
