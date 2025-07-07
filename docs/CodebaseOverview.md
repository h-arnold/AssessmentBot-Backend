# Codebase Overview

This document provides a high-level overview of the Assessment Bot Backend codebase, outlining its core principles, technology stack, and modular structure.

## 1. Core Principles

Adherence to these principles is paramount for all contributions:

*   **Security First**: Prioritise security. All inputs must be validated, outputs sanitised, and secrets managed via environment variables.
*   **Statelessness**: The application is designed to be stateless. No session information or user data should be stored on the server.
*   **Modularity & OOP**: The codebase follows SOLID principles and NestJS module conventions. Components are designed to be focused and reusable, avoiding monolithic structures.
*   **Test-Driven Development (TDD)**: Comprehensive tests are required for all new features and bug fixes, following the existing testing structure.
*   **Documentation**: Clear JSDoc comments are maintained for functions, classes, and modules. Swagger documentation is kept up-to-date.

## 2. Technology Stack & Key Libraries

The Assessment Bot Backend is built using the following technologies and key libraries:

*   **Runtime**: Node.js (specifically `node:20-alpine` in a Docker container).
*   **Language**: TypeScript.
*   **Framework**: NestJS.
*   **Authentication**: Passport.js (with `passport-http-bearer` for API keys).
*   **Validation**: Zod for all data validation (DTOs, environment variables).
*   **Testing**: Jest for unit, integration, and E2E tests, with `supertest` for E2E testing.
*   **LLM Integration**: An abstract `LlmService` is used for interactions with Large Language Models, and `json-repair` for robust response parsing.

## 3. Codebase Structure Overview

The main application source code resides in the `src/` directory, organised into logical modules:

*   `src/`: Main application source code.
    *   `src/v1/assessor`: Contains version 1 of the core assessment logic.
    *   `src/auth`: Handles authentication strategies and guards.
    *   `src/common`: Stores shared utilities, filters, and pipes.
    *   `src/config`: Manages environment variable configuration using `@nestjs/config`.
    *   `src/llm`: Provides abstractions for interacting with Large Language Models.
    *   `src/prompt`: Contains logic for generating prompts for the LLM.

Other important directories include:

*   `test/`: Houses end-to-end tests.
*   `.devcontainer/`: Development container configuration.
*   `docs/`: Project documentation, including developer guides and API documentation.
