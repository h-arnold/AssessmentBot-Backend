# Stage 5: Assessor Feature Module Test Cases

This document lists comprehensive test scenarios for Stage 5 (Assessor Feature Module) of the Assessment Bot backend. All tests should be implemented using Jest (unit tests and integration tests with NestJS TestingModule) and Supertest for controller E2E tests as appropriate.

---

## 1. DTO Validation (CreateAssessorDto)

- **Valid payloads**
  - Accept a payload with all required fields: `taskType`, `reference`, `template`, `studentResponse`, where:
    - `taskType` is a required ENUM value: `TaskType.TEXT`, `TaskType.TABLE`, or `TaskType.IMAGE`.
    - All of `reference`, `template`, and `studentResponse` are non-empty text strings.
  - Accept a payload with all required fields as binary image blobs (e.g., Buffers or base64 strings), with `taskType` set to `TaskType.IMAGE`.
  - Reject payloads where the fields are a mix of types (e.g., some strings, some blobs/base64).

- **Invalid payloads**
  - Reject when any of the fields (`taskType`, `reference`, `template`, `studentResponse`) is missing.
  - Reject when `taskType` is not a valid ENUM value (`TaskType.TEXT`, `TaskType.TABLE`, `TaskType.IMAGE`).
  - Reject when any field is not a string, Buffer, or valid base64 string.
  - Reject empty strings for any text field.
  - Reject extra unsupported fields (e.g., `metadata`, `tags`).
  - Reject null or undefined for any required field.

---

## 2. Controller Endpoint (AssessmentController)

### 2.1 POST /assessment (submit)

- **Happy path**
  - Returns **201 Created** and a JSON body containing the assessment result when a valid DTO is supplied.
  - The `AssessmentService.submit()` method is called with the correct DTO.

- **Validation errors**
  - Returns **400 Bad Request** when the DTO validation fails (e.g., missing fields, invalid `taskType`).

- **Authentication/Authorisation**
  - Returns **401 Unauthorized** when no API key is provided or the key is invalid.

---

## 3. Service Layer (AssessmentService) Unit Tests

- **Method existence**
  - The class has a `submit(dto)` method.

- **submit(dto)**
  - Returns a stubbed assessment result object when called with a valid DTO.
  - Throws an appropriate error or rejects a promise if an internal error is simulated.

---

## 4. Integration Tests (Optional/E2E)

_(For Stage 5, focus is on unit tests—E2E tests can be added in future stages.)_

---

_All tests should mock external dependencies (e.g., database or LLMService) and focus on the behaviour of the Assessor module in isolation._
