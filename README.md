# Assessment Bot - Backend

![CI - Unit & E2E Tests](https://github.com/h-arnold/AssessmentBot-Backend/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/h-arnold/AssessmentBot-Backend/actions/workflows/codeql.yml/badge.svg)
![SonarQube](https://github.com/h-arnold/AssessmentBot-Backend/actions/workflows/sonarqube.yml/badge.svg)

This repository contains the backend code for the Assessment Bot, which is responsible for managing assessments, grading, and providing feedback. It is written in TypeScript and uses Node.js as the runtime environment.

There is no front end, and is accessible via a REST API only. Configuration values are stored in environment variables, and prompt templates are stored as markdown files. It is designed to be stateless, meaning that it does not store any user data or session information on the server.

It will start initially as a monolithic application that will be run in a minimal Docker container, ensuring cloud agnosticism. If the project expands, the goal should be a collection of microservices that can initially be coordinated via a single Docker Compose file, and later orchestrated with Kubernetes.

## Guiding Principles

1. **Security**: Always prioritise security in your code. Validate inputs, sanitise outputs, and handle sensitive data with care. This includes using environment variables for configuration and secrets, and ensuring that any user-generated content is properly escaped to prevent XSS attacks.
   - Use structured logging for all authentication attempts and errors, leveraging NestJS's built-in Logger or a compatible logging library. Ensure logs include enough detail (e.g., IP address, timestamp, reason for failure) to support external tools like fail2ban for automated blocking of malicious IPs.
2. **Ephemerality**: Design the system to be stateless. Assessment Bot prioritises privacy above all else. No student PII is should even be sent to the backend. Maintaining statelessness ensures that any inadvertent data leaks persist only as long as the request is being processed.
3. **Performance**: Write efficient code that minimises resource usage. Use asynchronous programming patterns to handle I/O operations without blocking the event loop.
4. **Use well-maintained libraries**: Avoid reinventing the wheel. Use well-maintained libraries and frameworks that are widely adopted in the Node.js ecosystem. This includes libraries for routing, database access, and validation.
5. **Modularity**: Structure the code in a modular way to promote reusability and maintainability. Use TypeScript interfaces and types to define clear contracts for modules.
6. **TDD**: Write tests for your code. Use a test framework like Jest or Mocha to ensure that your code is reliable and maintainable. Write unit tests for individual functions and integration tests for the overall system.
   - Leverage NestJS’s built-in testing utilities (TestingModule) and e2e support with Jest and Supertest; use the Nest CLI to scaffold and run both unit and e2e tests out of the box.
7. **Strong Object-Oriented Design**: Use object-oriented design principles to create a clean and maintainable codebase. This includes using classes, interfaces, and inheritance where appropriate.
   a. **Refactor to avoid God Objects**: Avoid creating "God Objects" that have too many responsibilities. Instead, break down complex objects into smaller, more manageable components.
   b. **SOLID**: Follow the SOLID principles.
8. **Documentation**: Write clear and concise documentation for your code. Use JSDoc comments to document functions, classes, and modules. Provide examples of how to use the code and explain any complex logic.

## Getting Started

To get the Assessment Bot backend up and running, follow these steps:

### Prerequisites

- **Node.js**: Version 22.x. You can download it from [nodejs.org](https://nodejs.org/).
- **Docker**: Docker Desktop (or Docker Engine and Docker Compose) installed and running. Follow the instructions for your operating system on the [Docker website](https://www.docker.com/get-started).
- **Git**: Git installed and configured. You can download it from [git-scm.com](https://git-scm.com/downloads).

### Initial Setup

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/h-arnold/AssessmentBot-Backend.git
    cd AssessmentBot-Backend
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Set up environment variables**:

    Copy the example environment file and populate it with your settings:

    ```bash
    cp .env.example .env
    # Open .env in your editor and configure as needed
    GEMINI_API_KEY=your_gemini_api_key
    ```

## Stack

- **Docker**: Use base image `node:22-alpine` for a minimal and efficient container.
- **Node.js**: The runtime environment for the backend code.
- **TypeScript**: The programming language used for the backend code, providing static typing and modern JavaScript features.
- **Passport.js**: For handling authentication strategies (e.g., API Keys via `passport-http-bearer`).
- **NestJS**: The core web framework. It is a progressive Node.js framework for building efficient, reliable and scalable server-side applications. It strongly aligns with the OOP and SOLID principles outlined above.
- **Zod**: A TypeScript-first schema declaration and validation library. It's essential for fulfilling the security principle of validating all inputs.
- **Jest**: The testing framework. An all-in-one framework that simplifies the TDD process mentioned in the guiding principles.
- **json-repair**: A library to fix malformed JSON strings, making LLM responses more robust.
- **@google/genai**: The official Google AI SDK for Node.js, used to interact with the Gemini family of models.
- **mustache**: A logic-less template engine used for rendering prompts.

## Development & QA Strategy

To uphold the guiding principles and ensure a high-quality, secure, and maintainable codebase, the project will adopt a comprehensive linting and Quality Assurance (QA) strategy.

### Automated Linting & Formatting

A consistent code style is enforced automatically to allow developers to focus on business logic.

- **ESLint**: Used to identify and report on problematic patterns in the TypeScript code. The configuration includes plugins for security (`eslint-plugin-security`), Jest best practices, and import ordering to support the **Security** and **Modularity** principles.
- **Prettier**: An opinionated code formatter integrated with ESLint to ensure a uniform code style across the entire project.
- **Husky & lint-staged**: Git hooks are used to automatically run the linter on staged files before they can be committed, catching issues early.

### Quality Assurance

QA is a multi-layered approach that builds confidence in the application's stability and security.

1. **Testing Pyramid**: The TDD principle is expanded with a structured testing approach:
   - **Unit Tests (Jest)**: The foundation. Individual classes and functions are tested in isolation, with external dependencies mocked.
   - **Integration Tests (NestJS `TestingModule`)**: The middle layer. Tests the interaction _between_ internal modules (e.g., Controller -> Service) to ensure they are wired correctly, without making external network calls.
   - **E2E Tests (Jest & Supertest)**: The top of the pyramid. The entire application is spun up to test the full request-response cycle via real HTTP requests, validating everything from authentication to the final response shape.

2. **Code Coverage Enforcement**: Jest's `--coverage` flag will be used within a CI/CD pipeline to enforce a minimum test coverage threshold. This ensures the TDD principle is consistently applied.

3. **Automated Security Scanning**:
   - **Dependency Scanning**: Tools like `npm audit` and GitHub's Dependabot will be used to automatically scan for vulnerabilities in third-party packages and facilitate updates.
   - **Static Application Security Testing (SAST)**: The `eslint-plugin-security` provides a baseline. Further analysis can be performed by tools like SonarQube/SonarCloud to detect more complex security vulnerabilities and track code quality over time.

4. **API Schema & Documentation**: To support the **Documentation** principle and provide clarity for API consumers, the project will use `@nestjs/swagger`. This package automatically generates an interactive OpenAPI (Swagger) specification directly from the code (Controllers and DTOs), ensuring the documentation is always in sync with the implementation.

## Expected Data Flow

1. Request comes in via the REST API. Contains Auth Token (API Key in the header) and a JSON body with reference task, template task and student response. A typical request payload looks like this:

```json
{
  "taskType": "One of: text, table, image (ENUM)",
  "referenceTask": "A string or blob containing the reference task",
  "templateTask": "A string or blob containing the template task",
  "studentTask": "A string or blob containing the student's response"
}
```

- The `taskType` field is an ENUM, not a resource. It is not possible to list, create, or delete task types via the API. Only the above values are valid, and new types can only be added by updating the codebase.
- The API exposes only a single endpoint for assessment submission (e.g., `POST /assessment`). There are no endpoints for listing, updating, or deleting assessment types.

### Assessor Endpoint (`POST /v1/assessor`)

This endpoint is responsible for initiating an assessment. It accepts a JSON payload containing the details of the assessment task, including the type of task (text, table, or image), a reference solution, a template, and the student's response. The endpoint is secured with an API key.

**Request Example:**

```json
{
  "taskType": "TEXT",
  "reference": "The quick brown fox jumps over the lazy dog.",
  "template": "Write a sentence about a fox.",
  "studentResponse": "A fox is a mammal."
}
```

**Response Example (201 Created):**

```json
{
  "completeness": {
    "score": 5,
    "reasoning": "The response is complete and addresses all aspects of the prompt."
  },
  "accuracy": {
    "score": 4,
    "reasoning": "The response is mostly accurate, but contains a minor factual error."
  },
  "spag": {
    "score": 3,
    "reasoning": "The response contains several spelling and grammar errors."
  }
}
```

**Error Responses:**

- `400 Bad Request`: If the payload is invalid (e.g., missing required fields, incorrect data types).
- `401 Unauthorized`: If no API key is provided or the API key is invalid.

2. Request is validated using Zod schemas.
3. If the request is valid, it is authenticated using Passport.js.
4. The request is handled by a NestJS `Controller`, which delegates the core logic to an appropriate `AssessorService` (e.g., for text, tables, or images).
5. A prompt object is generated using the reference, template and student response.
6. The prompt is sent to an LLMService superclass, which handles the interaction with the the chosen LLM. Each LLM (e.g. OpenAI, Anthropic) will have its own subclass that implements the specific API calls.
7. The LLM processes the prompt and returns a raw string response.
8. The raw response is passed through a resilient parsing mechanism. First, it attempts a standard `JSON.parse()`. If that fails, it uses `json-repair` to fix common syntax errors before attempting to parse again.
9. The repaired and parsed JSON object is validated against a Zod schema to ensure it conforms to the expected structure.
10. The validated response is processed by the `AssessorService`, which cleans the data and formats it for the client.
11. The final response is returned to the client via the REST API.

## Initial Class Structure

To support the guiding principles and the expected data flow, the initial backend structure will be organized into modules, each with a distinct responsibility. This modular approach, central to the NestJS framework, enhances maintainability, testability, and separation of concerns.

### Directory Layout

The proposed structure within the `src/` directory is as follows:

src
├── app.module.ts
├── main.ts
│
├── v1
│ └── assessor
│ ├── dto
│ │ └── create-assessor.dto.ts
│ ├── assessor.controller.ts
│ ├── assessor.module.ts
│ └── assessor.service.ts
│
├── auth
│ ├── api-key.guard.ts
│ ├── api-key.service.ts
│ ├── api-key.strategy.ts
│ ├── auth.module.ts
│ └── user.interface.ts
│
├── common
│ ├── common.module.ts
│ ├── file-utils.ts
│ ├── http-exception.filter.ts
│ ├── json-parser.util.ts
│ ├── pipes
│ │ └── image-validation.pipe.ts
│ ├── utils
│ │ ├── log-redactor.util.ts
│ │ └── type-guards.ts
│ └── zod-validation.pipe.ts
│
├── config
│ ├── config.module.ts
│ ├── config.service.ts
│ ├── env.schema.ts
│ ├── index.ts
│ └── throttler.config.ts
│
├── llm
│ ├── gemini.service.ts
│ ├── llm.module.ts
│ ├── llm.service.interface.ts
│ ├── resource-exhausted.error.ts
│ └── types.ts
│
├── prompt
│ ├── image.prompt.ts
│ ├── prompt.base.ts
│ ├── prompt.factory.ts
│ ├── prompt.module.ts
│ ├── table.prompt.ts
│ ├── templates
│ │ ├── image.system.prompt.md
│ │ ├── table.system.prompt.md
│ │ ├── table.user.prompt.md
│ │ ├── text.system.prompt.md
│ │ └── text.user.prompt.md
│ └── text.prompt.ts
│
└── status
├── status.controller.ts
├── status.module.ts
└── status.service.ts
│

### Component Breakdown

- `v1/assessor`: The versioned core feature module. The `AssessorController` serves as the entry point for API requests, the `AssessorService` orchestrates the business logic (calling the LLM, parsing the response), and the `dto` subdirectory defines the shape of the data using Zod schemas. Versioning allows for future API evolution without breaking existing clients.
- `auth`: This module handles all authentication concerns. It contains the Passport.js `ApiKeyStrategy` for validating API keys, the `ApiKeyGuard` to protect endpoints, and the `ApiKeyService` for key management, keeping security logic isolated.
- `common`: A module for shared, reusable components that don't belong to a specific feature. This includes custom `pipes` (for Zod validation and image validation), `utils` (like the resilient JSON parser and logging utilities), and the global HTTP exception filter.
- `config`: Manages environment variables using a custom ConfigModule and ConfigService. All configuration is validated centrally using Zod schemas and is accessible in a type-safe manner. Includes throttler configuration for rate limiting.
- `llm`: This module abstracts the interaction with Large Language Models. It features the `LlmService` interface and concrete implementations like `GeminiService`. This design allows the application to easily support different LLM providers while maintaining a consistent internal interface.
- `prompt`: Provides a flexible, object-oriented abstraction for generating prompts tailored to different assessment types. The `PromptBase` class serves as the foundation, with specific implementations for text, table, and image prompts. Template files are stored in the `templates` subdirectory.
- `status`: Provides health check and status endpoints for monitoring the application's state and version information.

## Testing Structure

In line with the **TDD** and **QA Strategy** principles, the project will maintain a comprehensive and organized testing suite. The structure is designed to clearly separate different types of tests, making them easy to write, find, and maintain.

### Directory Layout

Tests are co-located with the source code for unit and integration tests, while end-to-end tests reside in a dedicated `test/` directory at the project root.

src
test/

```
src
└── ...
└── v1
    └── assessor
        ├── assessor.controller.spec.ts  # Unit/Integration test for the controller
        ├── assessor.controller.ts
        ├── assessor.service.spec.ts     # Unit test for the service
        └── assessor.service.ts


├── assessor.e2e-spec.ts                 # E2E test for the assessor endpoint
├── jest-e2e.json                        # Jest config for E2E tests
└── setup.ts                             # Optional global setup for tests
```

### Test Type Breakdown

The testing strategy follows the classic testing pyramid model:

- **Location**: Co-located with the source file (e.g., `assessor.service.spec.ts` is next to `assessor.service.ts`).
- **Purpose**: To test a single class or function in complete isolation. All external dependencies (like other services, repositories, or external APIs) are mocked using Jest's mocking capabilities (`jest.fn()`, `jest.spyOn()`).
- **Scope**: Forms the largest part of the test suite, ensuring individual components behave as expected.

- **Location**: Also co-located with the source files, often testing the module's primary entry point, like a controller.
- **Purpose**: To test the interaction _between_ multiple, co-dependent classes within the application's dependency injection container. NestJS's `Test.createTestingModule()` is used to build a testing module that mirrors the actual application module, but with external infrastructure (like LLM clients or databases) mocked.
- **Scope**: Verifies that modules are wired correctly and that components like controllers, services, and guards work together as intended.

- **Location**: In the root `test/` directory.
- **Purpose**: To test the entire application from the outside in. It starts the full NestJS application and sends real HTTP requests to its endpoints using a library like `supertest`.
- **Scope**: Validates the full request/response lifecycle, including authentication, request validation (DTOs/Pipes), controller logic, service execution, and the final HTTP response format and status code. These tests are the most comprehensive but also the slowest to run.

## Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure the following variables:

### Required Variables

- `GEMINI_API_KEY`: The API key for the Google Gemini service. Required for LLM functionality.

### Authentication & Security

- `API_KEYS`: Comma-separated list of valid API keys for client authentication. Use strong, randomly generated strings (e.g., `openssl rand -base64 32`).

### Image Upload Configuration

- `MAX_IMAGE_UPLOAD_SIZE_MB`: Sets the maximum allowed image size (in megabytes) for uploads. Default is `1` MB.
- `ALLOWED_IMAGE_MIME_TYPES`: Comma-separated list of allowed image MIME types (e.g., `image/png,image/jpeg`). Default is `image/png`.

### Rate Limiting (Throttling)

- `THROTTLER_TTL`: Time-to-live for rate-limiting windows in seconds. Default is `60`.
- `UNAUTHENTICATED_THROTTLER_LIMIT`: Maximum requests per TTL window for unauthenticated routes. Default is `10`.
- `AUTHENTICATED_THROTTLER_LIMIT`: Maximum requests per TTL window for authenticated routes. Default is `90`.

### LLM Configuration

- `LLM_BACKOFF_BASE_MS`: Base backoff time in milliseconds for LLM rate limit retries. Default is `1000`.
- `LLM_MAX_RETRIES`: Maximum number of retry attempts for LLM rate limit errors. Default is `3`.

### Application Settings

- `NODE_ENV`: Application environment (`development`, `production`, `test`). Default is `development`.
- `PORT`: Port on which the server runs. Default is `3000`.
- `APP_NAME`: Application name. Default is `AssessmentBot-Backend`.
- `APP_VERSION`: Application version. Optional, defaults to version from `package.json`.
- `LOG_LEVEL`: Logging verbosity level (`fatal`, `error`, `warn`, `info`, `debug`, `verbose`). Default is `info`.

### Example Configuration

```env
NODE_ENV=development
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
API_KEYS=your_secret_key,another_secret_key
MAX_IMAGE_UPLOAD_SIZE_MB=1
ALLOWED_IMAGE_MIME_TYPES=image/png,image/jpeg
```

All variables are validated at startup using Zod schemas to ensure type safety and proper configuration.

## Security & Quality Assurance

This project includes automated penetration testing and security validation through dedicated E2E tests. These tests help proactively validate the robustness of the API against various attack vectors including prototype pollution, NoSQL injection, brute force attempts, and advanced input attacks.

### Required GitHub Secrets

The following secrets must be configured in the GitHub repository settings for workflows to function properly:

- **`SONAR_TOKEN`**: Required for SonarQube/SonarCloud static analysis. This token should be generated from your SonarCloud account and have permissions to analyse the `h-arnold_AssessmentBot-Backend` project.
  - Go to [SonarCloud My Account](https://sonarcloud.io/account/security) → Security → Generate Token
  - Add the token to GitHub repository Settings → Secrets and variables → Actions → New repository secret

**Note**: The SonarQube configuration (project key, organisation, and host URL) is already defined in `sonar-project.properties`.

### Security Testing

Security tests are integrated into the E2E test suite and can be run using:

```bash
npm run test:e2e
```

The test suite includes:

- Penetration testing for common vulnerabilities
- API key authentication validation
- Rate limiting verification
- Input validation and sanitisation testing
- Advanced attack vector simulation

> **Note:** These tests are for internal security validation only. Do not use them against production systems without explicit authorisation.

---
