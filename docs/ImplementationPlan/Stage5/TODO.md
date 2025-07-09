# Stage 5: Assessor Feature Module TODO

- [ ] Create a new git branch for this work:
  ```bash
  git checkout -b Stage5
  ```

This document outlines the tasks for implementing the Assessor feature module, following a Test-Driven Development (TDD) workflow. Each section represents a micro-cycle of writing tests, implementing code, and refactoring.

---

### 1. DTO and Validation (`CreateAssessorDto`)

**Objective**: Create a Data Transfer Object (DTO) for the assessment endpoint with robust validation using Zod.

#### Red Phase: Write Failing Tests for DTO Validation

- [ ] Create a new directory `src/v1/assessor/` for the new module's source code.
- [ ] Create a test file `src/v1/assessor/dto/create-assessor.dto.spec.ts`.
- [ ] In the test file, write tests that assert the Zod schema rejects invalid data. Cover the following cases from `TestCases.md`:
  - [ ] **Invalid Payloads**:
    - [ ] Reject when any required field (`taskType`, `reference`, `template`, `studentResponse`) is missing.
    - [ ] Reject empty strings for `reference`, `template`, and `studentResponse`.
    - [ ] Reject payloads with extra, unsupported fields.
    - [ ] Reject `null` or `undefined` for any required field.
    - [ ] Reject when fields are a mix of types (e.g., some strings, some Buffer/base64).
- [ ] Write tests that assert the Zod schema accepts valid data:
  - [ ] **Valid Payloads**:
    - [ ] Accept a payload where `taskType` is `TEXT` and all other fields are non-empty strings.
    - [ ] Accept a payload where `taskType` is `TABLE` and all other fields are non-empty strings.
    - [ ] Accept a payload where `taskType` is `IMAGE` and all other fields are non-empty strings.
    - [ ] Accept a payload where `taskType` is `IMAGE` and fields are Buffers or base64 strings.

#### Green Phase: Implement the DTO and Zod Schema

- [ ] Create the DTO file `src/v1/assessor/dto/create-assessor.dto.ts`.
- [ ] Define a `TaskType` enum with values `TEXT`, `TABLE`, and `IMAGE`.
- [ ] Define the Zod schema for `CreateAssessorDto` that enforces all the validation rules tested in the red phase.
- [ ] Create a TypeScript type `CreateAssessorDto` inferred from the Zod schema.
- [ ] Run the tests created in the red phase and ensure they all pass.

#### Refactor & Commit

- [ ] Review the DTO and test code for clarity, consistency, and adherence to project standards.
- [ ] Commit the changes with a clear message.
- [ ] **Commit ID**: `________________`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 2. Assessor Service Skeleton

**Objective**: Create a skeleton `AssessorService` that can be injected into the controller.

#### Red Phase: Write Failing Tests for the Service

- [ ] Create the service test file `src/v1/assessor/assessor.service.spec.ts`.
- [ ] Write a test to ensure the `AssessorService` can be created and is defined.
- [ ] Write a test for a `createAssessment` method that:
  - [ ] Exists on the service.
  - [ ] Accepts an argument that conforms to the `CreateAssessorDto` type.
  - [ ] Returns a placeholder or stubbed response (e.g., a simple object or string).
  - [ ] Simulate and assert error handling: when an internal error is thrown, the method should propagate or reject appropriately.

#### Green Phase: Implement the Service Skeleton

- [ ] Create the service file `src/v1/assessor/assessor.service.ts`.
- [ ] Create the `AssessorService` class.
- [ ] Implement the `createAssessment` method with the correct signature and a stubbed return value.
- [ ] Run the service tests and ensure they pass.

#### Refactor & Commit

- [ ] Review the service and test code.
- [ ] Commit the changes.
- [ ] **Commit ID**: `________________`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 3. Assessor Controller and Endpoint

**Objective**: Create the `AssessorController` to expose a `POST` endpoint for creating assessments.

#### Red Phase: Write Failing End-to-End (E2E) Tests

- [ ] Create a new E2E test file `test/assessor.e2e-spec.ts`.
- [ ] Set up the test environment using `supertest` and the NestJS `Test` module.
- [ ] Write E2E tests for the `POST /v1/assessor` endpoint:
  - [ ] Test for endpoint existence: a `POST` request to `/v1/assessor` should not result in a `404 Not Found`.
  - [ ] Test for validation failure: send an invalid DTO (e.g., missing `taskType`) and assert that the response is `400 Bad Request`.
  - [ ] Test for validation success: send a valid DTO and assert that the response is `201 Created`.
  - [ ] Test that the `AssessorService`'s `createAssessment` method is called exactly once with the correct payload when the request is valid. Use a mock provider for the service.
  - [ ] Write E2E tests for authentication/authorisation:
    - [ ] Returns **401 Unauthorized** when no API key is provided.
    - [ ] Returns **401 Unauthorized** when an invalid API key is provided.

#### Green Phase: Implement the Controller

- [ ] Create the controller file `src/v1/assessor/assessor.controller.ts`.
- [ ] Create the `AssessorController` class with the `@Controller('v1/assessor')` decorator.
- [ ] Create a `create` method with the `@Post()` decorator.
- [ ] Use the `ZodValidationPipe` in the method signature to validate the request body against the `createAssessorDtoSchema`.
- [ ] Inject `AssessorService` into the controller.
- [ ] Call the `assessorService.createAssessment` method from the controller's `create` method.
- [ ] Ensure the controller uses `@UseGuards(ApiKeyGuard)` or global guard for authentication on endpoints.
- [ ] Run the E2E tests and ensure they pass.

#### Refactor & Commit

- [ ] Review the controller and E2E test code.
- [ ] Commit the changes.
- [ ] **Commit ID**: `________________`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 4. Module Creation and Integration

**Objective**: Create the `AssessorModule` and integrate it into the main `AppModule`.

#### Red Phase: Write Failing Integration Tests

- [ ] Create a module test file `src/v1/assessor/assessor.module.spec.ts`.
- [ ] Write a test to ensure the `AssessorModule` can be compiled successfully by the NestJS `Test.createTestingModule`.
- [ ] Write a test to ensure that `AssessorController` and `AssessorService` are available for injection from the module context.

#### Green Phase: Create and Integrate the Module

- [ ] Create the module file `src/v1/assessor/assessor.module.ts`.
- [ ] Define the `AssessorModule` using the `@Module()` decorator.
- [ ] Add `AssessorController` to the `controllers` array.
- [ ] Add `AssessorService` to the `providers` array.
- [ ] Import the new `AssessorModule` into the `imports` array of the main `AppModule` in `src/app.module.ts`.
- [ ] Run the module integration tests and ensure they pass.
- [ ] Run the entire test suite (`npm test`) to ensure all new and existing tests pass.

#### Refactor & Commit

- [ ] Review the module file and ensure all dependencies are correctly listed.
- [ ] Commit the final changes for this stage.
- [ ] **Commit ID**: `________________`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 5. Verification & Smoke Testing

**Objective**: Verify the assessor endpoint in a running environment via scripted requests.

#### Tasks:

- [ ] Build and run the application (`npm run start:dev`) or via Docker Compose (`docker-compose up -d`).
- [ ] Install HTTP client dependency for scripting (e.g., `npm install axios --save-dev`).
- [ ] Create a TypeScript script at `scripts/verify-assessor.ts` that:
  - [ ] Sends a POST to `/v1/assessor` with a valid JSON payload and valid API key, asserts `201 Created` and expected response body.
  - [ ] Sends a POST to `/v1/assessor` with an invalid payload, asserts `400 Bad Request`.
  - [ ] Sends a POST to `/v1/assessor` without an `Authorization` header, asserts `401 Unauthorized`.
- [ ] Add an npm script to `package.json`:
  ```json
  "verify:assessor": "ts-node scripts/verify-assessor.ts"
  ```
- [ ] Run `npm run verify:assessor` and ensure all tests pass.
- [ ] Optionally, add a Postman collection `postman/AssessorTests.postman_collection.json` for manual verification.

#### Refactor & Commit

- [ ] Review the verification script for completeness and clarity.
- [ ] Commit changes with message:
  ```
  chore: add TypeScript smoke tests for assessor module (verify-assessor.ts)
  ```

---

### 6. Documentation Updates

**Objective**: Ensure all relevant documentation is up-to-date and accurate for the new Assessor feature.

#### Tasks:

- [ ] Update the main `README.md` to include:
  - [ ] A description of the new Assessor endpoint and its purpose.
  - [ ] Example request/response for `/v1/assessor`.
  - [ ] Any new environment variables or configuration relevant to the Assessor module.
- [ ] Update API documentation in `docs/api/API_Documentation.md`:
  - [ ] Add the new `/v1/assessor` endpoint, request/response schema, and error codes.
  - [ ] Document authentication requirements (API key).
  - [ ] List all validation rules and expected payloads.
- [ ] Update or add JSDoc comments in all new and modified TypeScript files:
  - [ ] DTOs, controller, service, and module.
  - [ ] Ensure all public methods and classes are documented.
- [ ] If any new configuration is added, update `docs/config/` as appropriate.
- [ ] If any new test cases or scenarios are discovered, update `docs/ImplementationPlan/Stage5/TestCases.md`.
- [ ] Review and update any other relevant documentation (e.g., diagrams, implementation plans) to reflect the new feature.

#### Refactor & Commit

- [ ] Review all documentation changes for clarity and completeness.
- [ ] Commit documentation updates with message:
  ```
  docs: update documentation for assessor module and API
  ```

---

### 7. Pull Request Submission

**Objective**: Submit your work for review and integration.

- [ ] Use the content of this TODO document as the body of your Pull Request (PR) description.
- [ ] Open a PR from the `Stage5` branch to the main branch.
- [ ] Ensure all CI checks pass and reviewers are assigned as per project guidelines.
