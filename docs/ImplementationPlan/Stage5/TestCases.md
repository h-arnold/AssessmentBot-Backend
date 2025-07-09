# Stage 5: Assessor Feature Module Test Cases

This document lists comprehensive test scenarios for Stage 5 (Assessor Feature Module) of the Assessment Bot backend. All tests should be implemented using Jest (unit tests and integration tests with NestJS TestingModule) and Supertest for controller E2E tests as appropriate.

---

## 1. DTO Validation (CreateAssessorDto)

- **Valid payloads**
  - Accept a payload with a non-empty text string only (e.g., `{ description: string }`).
  - Accept a payload with a binary image blob only (e.g., `{ image: Buffer }` or base64 string).
  - Accept a payload with both `description` (string) and `image` (binary/base64).

- **Invalid payloads**
  - Reject when `description` is missing and no other field present (if `description` is required).
  - Reject when `description` is not a string (e.g., number, object, array).
  - Reject when `image` is not a Buffer or valid base64 string.
  - Reject extra unsupported fields (e.g., `metadata`, `tags`).
  - Reject empty strings for `description` if min length constraint applies.
  - Reject null or undefined for any required field.

---

## 2. Controller Endpoints (AssessorController)

### 2.1 POST /assessors (create)

- **Happy path**
  - Returns **201 Created** and a JSON body matching the created assessor stub when valid DTO supplied.
  - Service `create()` is called with the correct DTO.

- **Validation errors**
  - Returns **400 Bad Request** when DTO validation fails (invalid `description`, `image`, or extra fields).

- **Authentication/Authorisation**
  - Returns **401 Unauthorized** when no API key provided or invalid API key.

### 2.2 GET /assessors (findAll)

- **Happy path**
  - Returns **200 OK** and an array of assessor stubs.
  - Returns an empty array if none exist.
  - Service `findAll()` is called once.

- **Authentication**
  - Returns **401 Unauthorized** when API key is missing or invalid.

### 2.3 GET /assessors/:id (findOne)

- **Happy path**
  - Returns **200 OK** and a single assessor stub when a valid ID is provided.
  - Service `findOne(id)` is called with the correct `id` param (string).

- **Not found**
  - Service throws `NotFoundException`; controller returns **404 Not Found**.

- **Validation errors**
  - Returns **400 Bad Request** when `id` param fails validation (e.g., not a UUID or required format).

- **Authentication**
  - Returns **401 Unauthorized** when API key missing or invalid.

### 2.4 PUT /assessors/:id (update)

- **Happy path**
  - Returns **200 OK** and the updated assessor stub.
  - Service `update(id, dto)` is called with correct parameters.

- **Validation errors**
  - Returns **400 Bad Request** for invalid DTO or `id` param.

- **Not found**
  - Service throws `NotFoundException`; controller returns **404 Not Found**.

- **Authentication**
  - Returns **401 Unauthorized** when API key missing or invalid.

### 2.5 DELETE /assessors/:id (remove)

- **Happy path**
  - Returns **204 No Content** on successful deletion.
  - Service `remove(id)` is called with the correct `id`.

- **Not found**
  - Service throws `NotFoundException`; controller returns **404 Not Found**.

- **Authentication**
  - Returns **401 Unauthorized** when API key missing or invalid.

---

## 3. Service Layer (AssessorService) Unit Tests

- **Method existence**
  - Class has methods: `create`, `findAll`, `findOne`, `update`, `remove`.

- **create(dto)**
  - Returns a stubbed assessor object when called with valid DTO.
  - Throws an appropriate error or rejects promise if backend error simulated.

- **findAll()**
  - Returns an array of assessor stubs (including empty array case).

- **findOne(id)**
  - Returns a stubbed object for an existing ID.
  - Throws `NotFoundException` when ID not found.

- **update(id, dto)**
  - Returns a stubbed updated object when ID exists and DTO is valid.
  - Throws `NotFoundException` when ID not found.

- **remove(id)**
  - Resolves without error (void) on successful deletion.
  - Throws `NotFoundException` when ID not found.

---

## 4. Integration Tests (Optional/E2E)

_(For Stage 5, focus is on unit tests—E2E tests can be added in future stages.)_

---

_All tests should mock external dependencies (e.g., database or LLMService) and focus on the behaviour of the Assessor module in isolation._
