# Implementation Overview

This document outlines the high-level implementation stages for the Assessment Bot Backend. Each stage builds upon the previous, resulting in a modular, testable, and maintainable application.

## ✅ (COMPLETE) Stage 1: Project Initialization and Setup

- **Objectives**: Scaffold a NestJS application, configure TypeScript, and set up version control and linting.  
- **Deliverables**:
  - NestJS monorepo created via Nest CLI
  - ESLint + Prettier configuration, Husky hooks, lint-staged setup
  - Dockerfile (`node:20-alpine`), basic `docker-compose.yml`
- **Test Criteria**:
  - `npm run lint` passes without errors
  - Dev server starts: `npm run start:dev`
  - Docker container builds and runs with basic health check endpoint
  - Health check endpoint (`/health`) returns application status and version

## Stage 2: Configuration and Environment Management

- **Objectives**: Implement `ConfigModule` to load and validate environment variables using Zod schemas.
- **Deliverables**:
  - `ConfigModule` with Zod-based validation pipe
  - Sample `.env.example` file
  - Integration of `ConfigModule` into `AppModule`
- **Test Criteria**:
  - Application fails to start on missing or invalid env vars
  - Unit tests for validation pipe coverage



## Stage 3: Common Utilities and Error Handling

- **Objectives**: Create shared utilities and global exception filters.
- **Deliverables**:
  - `CommonModule` exporting `HttpExceptionFilter`, `ZodValidationPipe`, and `JsonParserUtil`
  - Global setup in `main.ts` to apply filters and pipes
- **Test Criteria**:
  - Exceptions are serialized consistently (using `HttpExceptionFilter`)
  - Validation errors return appropriate HTTP responses
  - Unit tests for each utility

## Stage 4: Authentication and API Key Guard

- **Objectives**: Secure endpoints with API Key authentication using Passport.js.
- **Deliverables**:
  - `AuthModule` containing `ApiKeyStrategy` and `ApiKeyGuard`
  - Integration of guard on protected routes
  - Documentation on how to issue and rotate API keys
- **Test Criteria**:
  - Protected endpoints return 401 without valid API key
  - Unit tests for guard and strategy logic

## Stage 5: Assessor Feature Module

- **Objectives**: Develop the `AssessorModule`, controllers, DTOs, and services.
- **Deliverables**:
  - `AssessorController` with CRUD endpoints for assessment tasks
  - `CreateAssessorDto` with Zod schema validation
  - `AssessorService` skeleton with dependency injection
- **Test Criteria**:
  - Endpoints accept and validate input, returning stubbed responses
  - Unit tests for controller and service layer

## Stage 6: LLM Integration

- **Objectives**: Implement `LLMModule` and service hierarchy for prompt handling.
- **Deliverables**:
  - `Prompt` base class and `TextPrompt`, `TablePrompt`, `ImagePrompt` implementations
  - `LLMService` interface and `GeminiService` implementation
  - Dependency injection of `LLMService` into `AssessorService`
  - Template loading system for markdown-based prompt files
  - File system utilities for reading and parsing prompt templates
- **Test Criteria**:
  - Prompt classes serialize to expected payloads
  - Mock LLM service returns deterministic output in tests
  - Prompt templates load correctly from markdown files

## Stage 7: JSON Repair and Parsing

- **Objectives**: Robustly handle LLM responses, repairing malformed JSON.
- **Deliverables**:
  - Integration of `json-repair` library in `JsonParserUtil`
  - Utility methods to normalize and validate LLM output
- **Test Criteria**:
  - Faulty JSON responses corrected and parsed successfully
  - Unit tests covering edge cases of malformed data

## Stage 8: Logging and Throttling

- **Objectives**: Add structured logging and rate limiting.
- **Deliverables**:
  - `LoggerModule` with NestJS Logger integration
  - `ThrottlerModule` configured for per-key rate limits
  - Middleware or interceptors for request logging
- **Test Criteria**:
  - Logs include timestamp, IP, API key, request path
  - Rate limits enforced; tests simulate throttling behavior

## Stage 9: API Documentation (Swagger)

- **Objectives**: Generate OpenAPI spec and interactive docs.
- **Deliverables**:
  - `SwaggerModule` setup in `AppModule`
  - Decorators on controllers and DTOs for schemas
  - Accessible `/api-docs` endpoint
- **Test Criteria**:
  - Swagger UI renders endpoints with correct models
  - E2E test for API docs endpoint

## Stage 10: Testing, CI/CD, and Deployment

- **Objectives**: Finalize tests, integrate CI, and prepare deployment pipelines.
- **Deliverables**:
  - Unit and E2E tests in Jest, coverage reports
  - GitHub Actions workflow for lint, test, build, and Docker push
  - Documentation of deployment steps
- **Test Criteria**:
  - CI pipeline passes on all branches
  - Coverage threshold enforced (e.g., 80%+)
  - Successful Docker image published to registry

---

*Once all stages are complete, the Assessment Bot Backend will be production-ready, fully documented, and verified through automated tests and CI/CD pipelines.*
