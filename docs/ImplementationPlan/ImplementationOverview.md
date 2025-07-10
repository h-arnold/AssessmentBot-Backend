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

## ✅ (COMPLETE) Stage 2: Configuration and Environment Management

- **Objectives**: Implement `ConfigModule` to load and validate environment variables using Zod schemas.
- **Deliverables**:
  - `ConfigModule` with Zod-based validation pipe
  - Sample `.env.example` file
  - Integration of `ConfigModule` into `AppModule`
- **Test Criteria**:
  - Application fails to start on missing or invalid env vars
  - Unit tests for validation pipe coverage

**Note on Zod Validation Scope:** For Stage 2, Zod validation focuses solely on environment variables at application startup. The `ZodValidationPipe` for request payload validation will be implemented in Stage 3 as part of the `CommonModule`.

## Stage 3: Common Utilities and Error Handling

- **Objectives**: Create shared utilities and global exception filters.
- **Deliverables**:
  - `CommonModule` exporting `HttpExceptionFilter`, `ZodValidationPipe`, and `JsonParserUtil`
  - Global setup in `main.ts` to apply filters and pipes
- **Test Criteria**:
  - Exceptions are serialized consistently (using `HttpExceptionFilter`)
  - Validation errors return appropriate HTTP responses
  - Unit tests for each utility

## ✅ (COMPLETE) Stage 4: Authentication and API Key Guard

- **Objectives**: Secure endpoints with API Key authentication using Passport.js.
- **Deliverables**:
  - `AuthModule` containing `ApiKeyStrategy` and `ApiKeyGuard`
  - Integration of guard on protected routes
  - Documentation on how to issue and rotate API keys
- **Test Criteria**:
  - Protected endpoints return 401 without valid API key
  - Unit tests for guard and strategy logic

### Module Resolution and Compilation Issues Encountered

During the implementation and verification of Stage 4, significant challenges were encountered related to module resolution and compilation, particularly when deploying the application within a Docker environment. These issues manifested as the application failing to start with `ERR_MODULE_NOT_FOUND` or `SyntaxError: Cannot use import statement outside a module` errors.

**Problem Description:**

The core of the problem stemmed from a mismatch between how TypeScript compiled the application's modules and how Node.js attempted to load them at runtime, especially within the Docker container.

1.  **Initial Docker Build Failure (`Cannot find module '/app/dist/main'`):**
    - **Cause:** The `docker-compose.yml` file initially included a volume mount (`.:/app`) that inadvertently overwrote the `dist` directory generated during the Docker image's build stage with the host machine's (potentially empty or outdated) `dist` directory. This resulted in the compiled application files not being present inside the container at runtime.
    - **Solution:** The problematic volume mount (`.:/app`) was removed from `docker-compose.yml`. This ensured that the `dist` directory, containing the compiled application, was correctly preserved from the Docker build stage.

2.  **Incorrect Main Module Path (`Cannot find module '/app/dist/main'` after volume fix):**
    - **Cause:** After resolving the volume mount issue, the application still failed to start because the `CMD` in the `Dockerfile` (`CMD ["node", "dist/main"]`) was pointing to `dist/main`, while the `nest build` command was compiling the `src/main.ts` file into `dist/src/main.js` (due to `rootDir` implicitly being `src` and `outDir` being `dist` in `tsconfig.json`).
    - **Solution:** The `CMD` in `Dockerfile` was updated to `CMD ["node", "dist/src/main.js"]` to correctly reference the compiled entry point. Similarly, the `start:prod` script in `package.json` was updated to `node dist/src/main.js`.

3.  **ES Module/CommonJS Conflict (`SyntaxError: Cannot use import statement outside a module` and `ERR_MODULE_NOT_FOUND`):**
    - **Cause:** The project's `package.json` had `"type": "module"`, indicating an ES module project. However, the `tsconfig.json` was configured to compile to ES modules (`"module": "ES2022"`), and a `postbuild` script was attempting to force `dist/package.json` to `"type": "commonjs"`. This created a conflict where compiled ES module syntax (`import` statements) was being run in a CommonJS context, leading to syntax errors. Additionally, Node.js's stricter ES module resolution rules caused `ERR_MODULE_NOT_FOUND` when imports lacked `.js` extensions (e.g., `import { AppModule } from './app.module';`).
    - **Solution:** Based on historical project notes (from `docs/ImplementationPlan/Stage1/TODO.md` and `docs/issues.md`), the established and working solution for this project was to compile to CommonJS. Therefore, `tsconfig.json` was updated to set `"module": "CommonJS"`. This ensured that the compiled JavaScript files used CommonJS syntax (`require`/`module.exports`), which aligned with the `postbuild` script's intention to set `dist/package.json` to `"type": "commonjs"`. This resolved the module resolution conflicts and allowed the application to start successfully.

**Lessons Learned and Future Prevention:**

- **Module System Consistency:** Ensure strict consistency between `package.json` (`"type"` field), `tsconfig.json` (`"module"` and `"moduleResolution"`), and any build-time modifications (e.g., `postbuild` scripts) regarding ES Modules vs. CommonJS.
- **Docker Volume Mounts:** Be cautious with broad volume mounts (`.:/app`) in `docker-compose.yml` as they can inadvertently overwrite build artifacts generated within the container. Prefer specific mounts for source code if live reloading is required, or rely on the Docker build process to include compiled assets.
- **Entry Point Verification:** Always verify the exact compiled output path of the main application file (`main.js`) and ensure that the `CMD` in the `Dockerfile` and `start` scripts in `package.json` correctly reference this path.
- **Comprehensive Logging:** Detailed application logs (both during build and runtime) are crucial for diagnosing subtle issues like module resolution failures.
- **Referencing Project History:** Consult project documentation (like `TODO.md` and `issues.md`) for historical context on resolved issues and established workarounds, as these often contain critical information about the project's specific configuration choices.

## ✅ (COMPLETE) Stage 5: Assessor Feature Module

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

_Once all stages are complete, the Assessment Bot Backend will be production-ready, fully documented, and verified through automated tests and CI/CD pipelines._
