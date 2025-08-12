# Testing Guide

This document provides a concise overview of the testing strategy, tools, and practices for the AssessmentBot-Backend project.

## Guiding Principles

We follow a **test-driven development (TDD)** approach, prioritising security, reliability, and maintainability. All tests and documentation must use **British English**.

## Running Tests

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `npm test`           | Run all unit and integration tests (`*.spec.ts`). |
| `npm run test:watch` | Run unit/integration tests in watch mode.         |
| `npm run test:cov`   | Run unit/integration tests and generate coverage. |
| `npm run test:e2e`   | Run all end-to-end tests (`*.e2e-spec.ts`).       |
| `npm run test:prod`  | Run production image tests (`*.prod-spec.ts`).    |
| `npm run test:debug` | Debug tests with the Node.js inspector.           |

## Test Architecture

Our strategy uses three primary types of tests:

### 1. Unit & Integration Tests

- **Location**: Co-located with source code (`src/**/*.spec.ts`).
- **Purpose**: To test individual components (services, pipes, DTOs) in isolation (unit tests) or in combination with other internal dependencies (integration tests).
- **Framework**: [Jest](https://jestjs.io/) and [NestJS Testing](https://docs.nestjs.com/testing) utilities.
- **Details**: For detailed examples and patterns, see [PRACTICAL_GUIDE.md](./PRACTICAL_GUIDE.md).

### 2. End-to-End (E2E) Tests

- **Location**: In the root `test/` directory (`*.e2e-spec.ts`).
- **Purpose**: To test complete API workflows from the perspective of a client, covering HTTP endpoints, authentication, and error handling.
- **Framework**: [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest).
- **Details**: For setup and environment details, see the [E2E_GUIDE.md](./E2E_GUIDE.md).

### 3. Production Image Tests

- **Location**: In the `prod-tests/` directory (`*.prod-spec.ts`).
- **Purpose**: To validate the final, production-ready Docker image. These tests build the image, run it, and perform smoke tests to ensure it starts and operates correctly.
- **Framework**: [Jest](https://jestjs.io/), [Docker CLI](https://docs.docker.com/engine/reference/commandline/cli/), and [Supertest](https://github.com/ladjs/supertest).
- **Details**: For setup and environment details, see the [PROD_TESTS_GUIDE.md](./PROD_TESTS_GUIDE.md).

## Core Concepts

### Environment & Configuration

Test environments are designed to be consistent and isolated.

- **Configuration Files**: Unit tests are configured via `jest.config.js`, and E2E tests via `jest-e2e.config.cjs`.
- **Environment Variables**: Test-specific environment variables are hardcoded in `test/utils/app-lifecycle.ts` to ensure consistency. This simplifies setup and avoids flaky tests.
- **Sensitive Keys**: For live E2E tests (`assessor-live.e2e-spec.ts`) that call the real Gemini API, you **must** provide a `GEMINI_API_KEY`. Create a `.test.env` file in the project root:
  ```
  GEMINI_API_KEY=your_real_api_key_here
  ```
  This file is git-ignored and is the **only** place where environment-specific secrets should be managed for testing.

### Test Data & Mocking

- **Static Data**: Reusable test data is stored in `test/data/` (JSON) and `test/ImageTasks/` (images).
- **Dynamic Data**: Factory classes (e.g., `TestDataFactory`) are used to generate DTOs and other objects for tests.
- **Mocking**: External dependencies, particularly the `LlmService`, are mocked in unit and integration tests using `jest.fn()`. This ensures tests are fast and independent of external services.

For detailed implementation patterns for data and mocking, see [PRACTICAL_GUIDE.md](./PRACTICAL_GUIDE.md).
