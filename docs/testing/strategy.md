# Testing Strategy

This document outlines the comprehensive testing approach and philosophy for the AssessmentBot-Backend project.

## Testing Philosophy

The AssessmentBot-Backend follows a **test-driven development (TDD)** approach with a strong emphasis on:

- **Security First**: All input validation, authentication, and authorisation mechanisms are thoroughly tested
- **Reliability**: Comprehensive coverage ensures the LLM assessment system works consistently
- **Maintainability**: Tests serve as living documentation and enable confident refactoring
- **Performance**: Load testing and resource management testing ensure system scalability

## Testing Pyramid

Our testing strategy follows the traditional testing pyramid with British English consistency:

### 1. Unit Tests (Foundation)

- **Purpose**: Test individual components in isolation
- **Scope**: Services, DTOs, utilities, pipes, filters, guards
- **Location**: Co-located with source code (`*.spec.ts` files)
- **Coverage Target**: >90% for critical business logic
- **Philosophy**: Fast, isolated, deterministic

### 2. Integration Tests (Middle Layer)

- **Purpose**: Test module interactions and dependency integration
- **Scope**: NestJS module testing, service collaboration, database interactions
- **Location**: Co-located with source code using `TestingModule`
- **Coverage**: Inter-module communication and configuration
- **Philosophy**: Verify component collaboration works correctly

### 3. End-to-End Tests (Top Layer)

- **Purpose**: Test complete user workflows and API contracts
- **Scope**: HTTP endpoints, authentication flows, error handling
- **Location**: Dedicated `test/` directory (`*.e2e-spec.ts` files)
- **Coverage**: Critical user journeys and API behaviour
- **Philosophy**: Simulate real user interactions

## Testing Framework Stack

### Core Framework

- **Jest**: Primary testing framework with TypeScript and ESM support
- **Supertest**: HTTP assertion library for E2E API testing
- **NestJS Testing**: TestingModule for dependency injection and module testing

### Configuration

- **Unit/Integration**: `jest.config.js` with ESM preset
- **E2E Tests**: `jest-e2e.config.cjs` with extended timeouts
- **Coverage**: Jest coverage reports with JUnit XML output

### Test Environment Management

- **Isolated Environments**: Each E2E test file runs against a fresh application instance
- **Hardcoded Configuration**: Consistent test environment variables prevent flaky tests
- **Mock Strategy**: External dependencies (LLM APIs) are mocked in unit/integration tests

## Test Categories and Patterns

### Security Testing

- API key validation and authentication flows
- Input sanitisation and Zod schema validation
- Authorisation guard testing
- Rate limiting and throttling verification

### Business Logic Testing

- Assessment generation and evaluation logic
- Prompt factory and template system
- LLM service abstraction and error handling
- JSON parsing and response validation

### Infrastructure Testing

- Configuration module validation
- Logging and error handling
- Module dependency injection
- Application lifecycle management

### Performance Testing

- Resource exhaustion scenarios
- Throttling behaviour under load
- Memory and processing constraints
- API response time validation

## Mocking Strategy

### Unit Tests

- **External APIs**: Mock all LLM service calls using Jest mocks
- **Configuration**: Mock ConfigService with predictable test values
- **Logging**: Mock Logger to prevent console noise during tests
- **File System**: Mock file operations for consistent test execution

### Integration Tests

- **Minimal Mocking**: Only mock external boundaries (LLM APIs, file system)
- **Real Dependencies**: Use actual NestJS dependency injection
- **Test Modules**: Leverage TestingModule for realistic integration scenarios

### E2E Tests

- **Live Application**: Start real application instances using `app-lifecycle.ts`
- **Mock External APIs**: Use dummy API keys and mock responses
- **Real HTTP**: Make actual HTTP requests to test API contracts

## Test Data Management

### Static Test Data

- **JSON Fixtures**: Standardised test data in `test/data/` directory
- **Immutable Data**: Test data files are version controlled and immutable
- **British English**: All test data uses British English spellings

### Dynamic Test Data

- **Generated Data**: Use factories for creating test objects with realistic values
- **Randomised Inputs**: Generate edge cases and boundary conditions
- **Cleanup Strategy**: Ensure tests don't leak data between runs

## Continuous Integration

### Test Execution

- **Pre-commit Hooks**: Husky runs linting and basic tests before commits
- **Pull Request Validation**: Full test suite runs on every PR
- **Coverage Reporting**: Maintain high test coverage with trend monitoring

### Environment Consistency

- **Containerised Testing**: Tests run in consistent Docker environments
- **Node.js Version**: Locked to specific Node.js version for reproducibility
- **Dependency Locking**: Package-lock.json ensures consistent dependencies

## Quality Gates

### Coverage Requirements

- **Unit Tests**: Minimum 85% line coverage for new code
- **Integration Tests**: All critical service interactions covered
- **E2E Tests**: All API endpoints and authentication flows covered

### Test Reliability

- **Zero Flaky Tests**: Tests must be deterministic and reliable
- **Fast Execution**: Unit tests complete in under 30 seconds
- **Clear Failures**: Test failures provide actionable error messages

### Documentation Standards

- **Test Descriptions**: Clear, behaviour-driven test names
- **Code Examples**: Tests serve as usage examples for APIs
- **British English**: All test descriptions use British English

## Error Testing Strategy

### Exception Scenarios

- **Invalid Input**: Test all input validation scenarios
- **Resource Exhaustion**: Test LLM API quota and rate limits
- **Network Failures**: Test timeout and connection error handling
- **Authentication Failures**: Test unauthorised and forbidden scenarios

### Error Response Validation

- **HTTP Status Codes**: Verify correct status codes for each error type
- **Error Messages**: Validate user-friendly error messages
- **Error Structure**: Ensure consistent error response format
- **Logging**: Verify appropriate error logging for debugging

## Test Maintenance

### Regular Review

- **Monthly Test Review**: Assess test effectiveness and coverage
- **Refactoring Support**: Update tests during code refactoring
- **Performance Monitoring**: Track test execution time trends
- **Dependency Updates**: Update testing dependencies regularly

### Documentation Updates

- **Living Documentation**: Keep test documentation current with code changes
- **Example Updates**: Update code examples when APIs change
- **Process Improvements**: Continuously refine testing processes

This testing strategy ensures the AssessmentBot-Backend maintains high quality, security, and reliability while supporting confident development and deployment.
