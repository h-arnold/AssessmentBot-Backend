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

## 4. Agent Workflow

To ensure a methodical and traceable development process, the agent *must* adhere to the following workflow:

### 4.1. TDD Workflow: A Hybrid Approach

While the project's `TODO.md` files may be structured with distinct "Red Phase" (all tests fail) and "Green Phase" (all tests pass) sections for organisational clarity, the agent will employ a hybrid TDD workflow:

1.  **Micro-Cycles (Red-Green-Refactor per Task)**: For each individual task or a small, logical group of tasks on the TODO list, the agent will follow a tight Red-Green-Refactor loop. This involves:
    *   **Red**: Writing a small number of failing tests that define the specific requirement.
    *   **Green**: Writing the simplest possible production code to make those specific tests pass.
    *   **Refactor**: Improving the implementation and test code while keeping the tests green.

2.  **Macro-Verification (End-of-Stage Check)**: After completing all the micro-cycles for a given stage or major feature, the agent will run the *entire* test suite. This ensures that changes made in later micro-cycles have not inadvertently broken functionality that was implemented and tested in earlier cycles.

This hybrid approach provides the immediate feedback and safety of small, iterative cycles while ensuring the overall integrity of the codebase at key integration points.

### 4.2. Commits and Documentation

1.  **Regular Commits**: After completing each logical sub-step (typically after each successful "Green" phase in a micro-cycle), commit the changes. Commit messages should be clear, concise, and follow Conventional Commits guidelines.
2.  **TODO List Updates**: Immediately after completing a sub-step, update the relevant TODO list (e.g., `docs/developer/Implementation Plan/Stage 1/TODO.md`) to:
    *   Mark the step as complete (`[X]`).
    *   Add any relevant notes or explanations.
    *   Append the **short commit ID** of the commit that addresses that item (e.g., `[X] Task completed (commit: abcdef1)`).
3.  **Issue Logging**: If a blocker or significant issue is encountered that prevents immediate progress on a TODO item, document it clearly in the TODO list with a "Blocker" note and a brief explanation (e.g., `[ ] Task blocked: (Blocker: brief explanation)`).

## 5. Codebase Structure Overview

*   `src/`: Main application source code.
    *   `src/v1/assessor`: Version 1 of the core assessment logic.
    *   `src/auth`: Authentication strategies and guards.
    *   `src/common`: Shared utilities, filters, and pipes.
    *   `src/config`: Environment variable management (`@nestjs/config`).
    *   `src/llm`: Abstractions for interacting with Large Language Models.
    *   `src/prompt`: Logic for generating prompts for the LLM.
*   `test/`: End-to-end tests.