# Gemini Code-Assist Instructions

This document provides guidance for interacting with the Assessment Bot backend codebase.

**IMPORTANT: This project uses British English. Ensure all code, comments, documentation, and commit messages use British English spellings (e.g., 'authorise', 'colour', 'centre').**

## 1. Core Principles

Adhere to these principles in all contributions:

*   **Security First**: Prioritise security. Validate all inputs with Zod, sanitise outputs, and manage secrets via environment variables.
*   **Statelessness**: The application is stateless. Do not store session information or user data on the server.
*   **Modularity & OOP**: Follow SOLID principles and NestJS module conventions. Keep components focused and reusable. Avoid God Objects.
*   **Test-Driven Development (TDD)**: Write comprehensive tests for all new features and bug fixes. Use the existing testing structure.
*   **Documentation**: Maintain clear JSDoc comments for functions, classes, and modules. Keep the Swagger documentation up-to-date.

## 2. Tech Stack & Key Libraries

*   **Runtime**: Node.js in a Docker container (`node:20-alpine`).
*   **Language**: TypeScript.
*   **Framework**: NestJS.
*   **Authentication**: Passport.js (specifically `passport-http-bearer` for API keys).
*   **Validation**: Zod for all data validation (DTOs, environment variables).
*   **Testing**: Jest for unit, integration, and E2E tests. Use `supertest` for E2E.
*   **LLM Integration**: Use the abstract `LlmService` for interactions and `json-repair` for robust response parsing.

## 3. Development Workflow

1.  **Code Implementation**:
    *   Follow the existing modular structure within the `src/` directory.
    *   Use NestJS CLI commands (`nest g ...`) for generating new modules, controllers, and services where appropriate.
    *   Adhere to the project's ESLint and Prettier configurations.

2.  **Testing**:
    *   **Unit/Integration Tests**: Co-locate test files with source code (e.g., `assessor.service.spec.ts` next to `assessor.service.ts`). Use NestJS's `TestingModule` for integration tests.
    *   **E2E Tests**: Place end-to-end tests in the root `test/` directory (e.g., `assessor.e2e-spec.ts`).
    *   Run tests using the project's npm scripts.

3.  **Linting & Committing**:
    *   Before committing, ensure all code passes linting checks.
    *   Husky hooks are configured to run `lint-staged` automatically on commit. Ensure your changes can pass these checks.

## 4. Codebase Structure Overview

*   `src/`: Main application source code.
    *   `src/v1/assessor`: Version 1 of the core assessment logic.
    *   `src/auth`: Authentication strategies and guards.
    *   `src/common`: Shared utilities, filters, and pipes.
    *   `src/config`: Environment variable management (`@nestjs/config`).
    *   `src/llm`: Abstractions for interacting with Large Language Models.
    *   `src/prompt`: Logic for generating prompts for the LLM.
*   `test/`: End-to-end tests.
