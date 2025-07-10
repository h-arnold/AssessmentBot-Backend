# Stage 5: Assessor Feature Module TODO

- [x] Create a new git branch for this work:
  ```bash
  git checkout -b Stage5
  ```

This document outlines the tasks for implementing the Assessor feature module, following a Test-Driven Development (TDD) workflow. Each section represents a micro-cycle of writing tests, implementing code, and refactoring.

---

### 1. DTO and Validation (`CreateAssessorDto`)

**Objective**: Create a Data Transfer Object (DTO) for the assessment endpoint with robust validation using Zod.

#### Red Phase: Write Failing Tests for DTO Validation

- [x] Create a new directory `src/v1/assessor/` for the new module's source code.
- [x] Create a test file `src/v1/assessor/dto/create-assessor.dto.spec.ts`.
- [ ] In the test file, write tests that assert the Zod schema rejects invalid data. Cover the following cases from `TestCases.md`:
  - [x] **Invalid Payloads**:
    - [x] Reject when any required field (`taskType`, `reference`, `template`, `studentResponse`) is missing.
    - [x] Reject empty strings for `reference`, `template`, and `studentResponse`.
    - [x] Reject payloads with extra, unsupported fields.
    - [x] Reject `null` or `undefined` for any required field.
    - [x] Reject when fields are a mix of types (e.g., some strings, some Buffer/base64).
- [x] Write tests that assert the Zod schema accepts valid data:
  - [x] **Valid Payloads**:
    - [x] Accept a payload where `taskType` is `TEXT` and all other fields are non-empty strings.
    - [x] Accept a payload where `taskType` is `TABLE` and all other fields are non-empty strings.
    - [x] Accept a payload where `taskType` is `IMAGE` and all other fields are non-empty strings.
    - [x] Accept a payload where `taskType` is `IMAGE` and fields are Buffers or base64 strings.

#### Green Phase: Implement the DTO and Zod Schema

- [x] Create the DTO file `src/v1/assessor/dto/create-assessor.dto.ts`.
- [x] Define a `TaskType` enum with values `TEXT`, `TABLE`, and `IMAGE`.
- [x] Define the Zod schema for `CreateAssessorDto` that enforces all the validation rules tested in the red phase.
- [x] Create a TypeScript type `CreateAssessorDto` inferred from the Zod schema.
- [x] Run the tests created in the red phase and ensure they all pass.

#### Refactor & Commit

- [ ] Review the DTO and test code for clarity, consistency, and adherence to project standards.
- [ ] Commit the changes with a clear message.
- [x] **Commit ID**: `e3834e8`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 2. Assessor Service Skeleton

**Objective**: Create a skeleton `AssessorService` that can be injected into the controller.

#### Red Phase: Write Failing Tests for the Service

- [x] Create the service test file `src/v1/assessor/assessor.service.spec.ts`.
- [x] Write a test to ensure the `AssessorService` can be created and is defined.
- [x] Write a test for a `createAssessment` method that:
  - [x] Exists on the service.
  - [x] Accepts an argument that conforms to the `CreateAssessorDto` type.
  - [x] Returns a placeholder or stubbed response (e.g., a simple object or string).
  - [x] Simulate and assert error handling: when an internal error is thrown, the method should propagate or reject appropriately.

#### Green Phase: Implement the Service Skeleton

- [x] Create the service file `src/v1/assessor/assessor.service.ts`.
- [x] Create the `AssessorService` class.
- [x] Implement the `createAssessment` method with the correct signature and a stubbed return value.
- [x] Run the service tests and ensure they pass.

#### Refactor & Commit

- [ ] Review the service and test code.
- [ ] Commit the changes.
- [x] **Commit ID**: `ce1b3a2`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 3. Assessor Controller and Endpoint

**Objective**: Create the `AssessorController` to expose a `POST` endpoint for creating assessments.

#### Red Phase: Write Failing End-to-End (E2E) Tests

- [x] Create a new E2E test file `test/assessor.e2e-spec.ts`.
- [x] Set up the test environment using `supertest` and the NestJS `Test` module.
- [x] Write E2E tests for the `POST /v1/assessor` endpoint:
  - [x] Test for endpoint existence: a `POST` request to `/v1/assessor` should not result in a `404 Not Found`.
  - [x] Test for validation failure: send an invalid DTO (e.g., missing `taskType`) and assert that the response is `400 Bad Request`.
  - [x] Test for validation success: send a valid DTO and assert that the response is `201 Created`.
  - [x] Test that the `AssessorService`'s `createAssessment` method is called exactly once with the correct payload when the request is valid. Use a mock provider for the service.
  - [x] Write E2E tests for authentication/authorisation:
    - [x] Returns **401 Unauthorized** when no API key is provided.
    - [x] Returns **401 Unauthorized** when an invalid API key is provided.

#### Green Phase: Implement the Controller

- [x] Create the controller file `src/v1/assessor/assessor.controller.ts`.
- [x] Create the `AssessorController` class with the `@Controller('v1/assessor')` decorator.
- [x] Create a `create` method with the `@Post()` decorator.
- [x] Use the `ZodValidationPipe` in the method signature to validate the request body against the `createAssessorDtoSchema`.
- [x] Inject `AssessorService` into the controller.
- [x] Call the `assessorService.createAssessment` method from the controller's `create` method.
- [x] Ensure the controller uses `@UseGuards(ApiKeyGuard)` or global guard for authentication on endpoints.
- [x] Run the E2E tests and ensure they pass.

#### Refactor & Commit

- [ ] Review the controller and E2E test code.
- [ ] Commit the changes.
- [x] **Commit ID**: `f3ea5e8`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 4. Module Creation and Integration

**Objective**: Create the `AssessorModule` and integrate it into the main `AppModule`.

#### Red Phase: Write Failing Integration Tests

- [x] Create a module test file `src/v1/assessor/assessor.module.spec.ts`.
- [x] Write a test to ensure the `AssessorModule` can be compiled successfully by the NestJS `Test.createTestingModule`.
- [x] Write a test to ensure that `AssessorController` and `AssessorService` are available for injection from the module context.

#### Green Phase: Create and Integrate the Module

- [x] Create the module file `src/v1/assessor/assessor.module.ts`.
- [x] Define the `AssessorModule` using the `@Module()` decorator.
- [x] Add `AssessorController` to the `controllers` array.
- [x] Add `AssessorService` to the `providers` array.
- [x] Import the new `AssessorModule` into the `imports` array of the main `AppModule` in `src/app.module.ts`.
- [x] Run the module integration tests and ensure they pass.
- [x] Run the entire test suite (`npm test`) to ensure all new and existing tests pass.

#### Refactor & Commit

- [ ] Review the module file and ensure all dependencies are correctly listed.
- [ ] Commit the final changes for this stage.
- [x] **Commit ID**: `ea5547d`

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 5. Verification & Smoke Testing

**Objective**: Verify the assessor endpoint in a running environment via scripted requests.

#### Tasks:

- [x] Build and run the application (`npm run start:dev`) or via Docker Compose (`docker-compose up -d`).
- [x] Install HTTP client dependency for scripting (e.g., `npm install axios --save-dev`).
- [x] Create a TypeScript script at `scripts/verify-assessor.ts` that:
  - [x] Sends a POST to `/v1/assessor` with a valid JSON payload and valid API key, asserts `201 Created` and expected response body.
- [x] Sends a POST to `/v1/assessor` with an invalid payload, asserts `400 Bad Request`.
- [x] Sends a POST to `/v1/assessor` without an `Authorization` header, asserts `401 Unauthorized`.
- [x] Add an npm script to `package.json`:
  ```json
  "verify:assessor": "ts-node scripts/verify-assessor.ts"
  ```

```
- [X] Run `npm run verify:assessor` and ensure all tests pass.
```

- [ ] Run `npm run verify:assessor` and ensure all tests pass.
- [ ] Optionally, add a Postman collection `postman/AssessorTests.postman_collection.json` for manual verification.

#### Refactor & Commit

- [ ] Review the verification script for completeness and clarity.
- [ ] Commit changes with message:
  ```
  chore: add TypeScript smoke tests for assessor module (verify-assessor.ts)
  ```
- [x] **Commit ID**: `890d6c5`

---

### 6. Documentation Updates

**Objective**: Ensure all relevant documentation is up-to-date and accurate for the new Assessor feature.

#### Tasks:

- [x] Update the main `README.md` to include:
  - [x] A description of the new Assessor endpoint and its purpose.
  - [x] Example request/response for `/v1/assessor`.
  - [ ] Any new environment variables or configuration relevant to the Assessor module.
- [x] Update API documentation in `docs/api/API_Documentation.md`:
  - [x] Add the new `/v1/assessor` endpoint, request/response schema, and error codes.
  - [x] Document authentication requirements (API key).
  - [x] List all validation rules and expected payloads.
- [x] Update or add JSDoc comments in all new and modified TypeScript files:
  - [x] DTOs, controller, service, and module.
  - [x] Ensure all public methods and classes are documented.
- [ ] If any new configuration is added, update `docs/config/` as appropriate.
- [ ] If any new test cases or scenarios are discovered, update `docs/ImplementationPlan/Stage5/TestCases.md`.
- [ ] Review and update any other relevant documentation (e.g., diagrams, implementation plans) to reflect the new feature.

#### Refactor & Commit

- [ ] Review all documentation changes for clarity and completeness.
- [ ] Commit documentation updates with message:
  ```
  docs: update documentation for assessor module and API
  ```
- [x] **Commit ID**: `f50d8d6`

---

### 7. Pull Request Submission

**Objective**: Submit your work for review and integration.

- [ ] Use the content of this TODO document as the body of your Pull Request (PR) description.
- [ ] Open a PR from the `Stage5` branch to the main branch.
- [ ] Ensure all CI checks pass and reviewers are assigned as per project guidelines.
