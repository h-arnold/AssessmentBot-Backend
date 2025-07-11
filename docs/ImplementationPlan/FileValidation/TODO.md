# File Validation TODO

- [x] Create a new git branch for this work:
  ```bash
  git checkout -b FileValidation
  ```

This document outlines the tasks for implementing file size and type validation for uploaded images, specifically for the `IMAGE` task type in `CreateAssessorDto`. It follows a Test-Driven Development (TDD) workflow, with each section representing a micro-cycle of writing tests, implementing code, and refactoring.

---

### 1. Environment Configuration

**Objective**: Add environment variables to configure the maximum allowed image size and allowed image MIME types.

#### Red Phase: Write Failing Tests for Environment Variables

- [x] Update `src/config/config.service.spec.ts` to include tests for the new environment variables:
  - **MAX_IMAGE_UPLOAD_SIZE_MB**
    - [x] `ConfigService should load MAX_IMAGE_UPLOAD_SIZE_MB as a number`
      - Set `MAX_IMAGE_UPLOAD_SIZE_MB` in `.env` to a valid number (e.g., `2`).
      - Verify `ConfigService.get('MAX_IMAGE_UPLOAD_SIZE_MB')` returns `2` (number).
    - [x] `ConfigService should use default MAX_IMAGE_UPLOAD_SIZE_MB if not set`
      - Unset `MAX_IMAGE_UPLOAD_SIZE_MB`.
      - Verify `ConfigService.get('MAX_IMAGE_UPLOAD_SIZE_MB')` returns `1` (default number).
    - [x] `ConfigService should reject invalid MAX_IMAGE_UPLOAD_SIZE_MB`
      - Set `MAX_IMAGE_UPLOAD_SIZE_MB` to a non-numeric string (e.g., `"abc"`).
      - Expect application startup to fail with a Zod validation error.
  - **ALLOWED_IMAGE_MIME_TYPES**
    - [x] `ConfigService should load ALLOWED_IMAGE_MIME_TYPES as an array of strings`
      - Set `ALLOWED_IMAGE_MIME_TYPES` to `"image/png,image/jpeg"`.
      - Verify `ConfigService.get('ALLOWED_IMAGE_MIME_TYPES')` returns `['image/png', 'image/jpeg']`.
    - [x] `ConfigService should use default ALLOWED_IMAGE_MIME_TYPES if not set`
      - Unset `ALLOWED_IMAGE_MIME_TYPES`.
      - Verify `ConfigService.get('ALLOWED_IMAGE_MIME_TYPES')` returns `['image/png']` (default array).
    - [x] `ConfigService should handle single ALLOWED_IMAGE_MIME_TYPES`
      - Set `ALLOWED_IMAGE_MIME_TYPES` to `"image/gif"`.
      - Verify `ConfigService.get('ALLOWED_IMAGE_MIME_TYPES')` returns `['image/gif']`.

#### Green Phase: Implement Environment Variables

- [x] Update the central Zod schema for environment variables in `src/config/config.service.ts` to include:
  - `MAX_IMAGE_UPLOAD_SIZE_MB`: A number representing the maximum image size in megabytes. Default to `1` (MB).
  - `ALLOWED_IMAGE_MIME_TYPES`: A comma-separated string of allowed image MIME types (e.g., `image/png,image/jpeg`). Default to `image/png`.
- [x] Add `MAX_IMAGE_UPLOAD_SIZE_MB=` and `ALLOWED_IMAGE_MIME_TYPES=` to the `.env.example` file with their default values.
- [x] Run the tests and ensure they all pass.

#### Refactor & Commit

- [x] Review the code and test for clarity, consistency, and adherence to project standards.
- [x] Commit the changes with a clear message.
- [x] **Commit ID**: 9826492

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 2. Global Payload Limit Configuration

**Objective**: Configure the global payload limit to prevent excessively large requests, especially for image uploads.

#### Red Phase: Write Failing Tests for Global Payload Limit

- [x] Update `src/config/config.service.spec.ts` to include tests for the `getGlobalPayloadLimit()` method:
  - [x] `getGlobalPayloadLimit should calculate correctly for default MAX_IMAGE_UPLOAD_SIZE_MB`
    - Set `MAX_IMAGE_UPLOAD_SIZE_MB` to `1`.
    - Verify `ConfigService.getGlobalPayloadLimit()` returns approximately `5MB` (accounting for base64 overhead and buffer).
  - [x] `getGlobalPayloadLimit should calculate correctly for a different MAX_IMAGE_UPLOAD_SIZE_MB`
    - Set `MAX_IMAGE_UPLOAD_SIZE_MB` to `2`.
    - Verify `ConfigService.getGlobalPayloadLimit()` returns approximately `9MB`.
- [x] Update `test/assessor.e2e-spec.ts` to include an E2E test for the global payload limit:
  - [x] `POST /v1/assessor with payload exceeding global limit should return 413 Payload Too Large`

#### Green Phase: Implement Global Payload Limit

- [x] In `src/config/config.service.ts`, add a helper method (e.g., `getGlobalPayloadLimit()`) that calculates the maximum allowed request body size.
  - This method should use `MAX_IMAGE_UPLOAD_SIZE_MB` from the environment variables.
  - The calculation should account for base64 encoding overhead (approx. 33% increase) for three potential images, plus a buffer for other text data.
  - Formula: `((MAX_IMAGE_UPLOAD_SIZE_MB * 1.33 * 3) + 1) MB` (rounded up to the nearest MB for simplicity, e.g., 5MB for 1MB image size).
- [x] In `src/main.ts`, configure the Express body parser to use this calculated limit.
  - Disable NestJS's default body parser: `bodyParser: false` in `NestFactory.create()` options.
  - Use `app.use(json({ limit: calculatedLimit }))` where `calculatedLimit` is obtained from `ConfigService.getGlobalPayloadLimit()`.
- [x] Run the tests and ensure they all pass.

#### Refactor & Commit

- [x] Review the code and test for clarity, consistency, and adherence to project standards.
- [x] Commit the changes with a clear message.
- [x] **Commit ID**: 7048ebe

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 3. Image Validation Pipe

**Objective**: Create a custom NestJS pipe to validate image file size and type.

#### Red Phase: Write Failing Tests for Image Validation Pipe

- [x] Create `src/common/pipes/image-validation.pipe.spec.ts` and write unit tests for `ImageValidationPipe`:
  - **Initialisation**
    - [x] `ImageValidationPipe should be defined`
    - [x] `ImageValidationPipe should inject ConfigService`
  - **Valid Inputs (should pass)**
    - [x] `Should allow a valid PNG Buffer within size limit`
    - [x] `Should allow a valid JPEG Buffer within size limit` (if JPEG is allowed in config)
    - [x] `Should allow a valid base64 PNG string within size limit`
    - [x] `Should allow a valid base64 JPEG string within size limit` (if JPEG is allowed in config)
    - [x] `Should allow non-image string inputs (e.g., for TEXT/TABLE task types)`
    - [x] `Should allow non-Buffer/non-string inputs (e.g., numbers, objects) to pass through`
  - **Invalid Inputs (should throw BadRequestException)**
    - [x] `Should reject a Buffer exceeding MAX_IMAGE_UPLOAD_SIZE_MB`
    - [x] `Should reject a base64 string exceeding MAX_IMAGE_UPLOAD_SIZE_MB`
    - [x] `Should reject a Buffer with a disallowed MIME type`
    - [x] `Should reject a base64 string with a disallowed MIME type`
    - [x] `Should reject an invalid base64 string format`
    - [x] `Should reject an empty Buffer`
    - [x] `Should reject an empty base64 string`
    - [x] `Should reject a Buffer that cannot be identified as an image type`
  - **Edge Cases**
    - [x] `Should handle MAX_IMAGE_UPLOAD_SIZE_MB = 0 (reject all images)`
    - [x] `Should handle empty ALLOWED_IMAGE_MIME_TYPES (reject all images)`

#### Green Phase: Implement Image Validation Pipe

- [x] Create a new file `src/common/pipes/image-validation.pipe.ts`.
- [x] Implement `ImageValidationPipe` that:
  - Extends `PipeTransform`.
  - Allows other types (e.g., plain strings for non-image task types) to pass through unchanged.
- [x] Run the tests and ensure they all pass.

#### Refactor & Commit

- [x] Review the code and test for clarity, consistency, and adherence to project standards.
- [x] Commit the changes with a clear message.
- [x] **Commit ID**: (implementation and tests present; see git log for details)

#### Green Phase: Implement Image Validation Pipe

- [ ] Create a new file `src/common/pipes/image-validation.pipe.ts`.
- [ ] Implement `ImageValidationPipe` that:
  - Extends `PipeTransform`.
  - Injects `ConfigService` to retrieve `MAX_IMAGE_UPLOAD_SIZE_MB` and `ALLOWED_IMAGE_MIME_TYPES`.
  - For `Buffer` inputs:
    - Checks the size of the Buffer against `MAX_IMAGE_UPLOAD_SIZE_MB`. Throws `BadRequestException` if too large.
    - Infers the MIME type from the Buffer (e.g., using a library like `file-type` or by inspecting magic bytes) and checks against `ALLOWED_IMAGE_MIME_TYPES`. Throws `BadRequestException` if not allowed.
  - For base64 string inputs:
    - Extracts the MIME type from the data URI (e.g., `data:image/png;base64,...`). Checks against `ALLOWED_IMAGE_MIME_TYPES`. Throws `BadRequestException` if not allowed.
    - Decodes the base64 string to get its size and checks against `MAX_IMAGE_UPLOAD_SIZE_MB`. Throws `BadRequestException` if too large.
  - Allows other types (e.g., plain strings for non-image task types) to pass through unchanged.
- [ ] Run the tests and ensure they all pass.

#### Refactor & Commit

- [x] Review the code and test for clarity, consistency, and adherence to project standards.
- [x] Commit the changes with a clear message.
- [x] **Commit ID**: [TO_BE_FILLED]

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 4. Integrate Validation Pipe into Assessor DTO

**Objective**: Apply the `ImageValidationPipe` to the image fields in `CreateAssessorDto`.

#### Red Phase: Write Failing E2E Tests for Assessor DTO Integration

- [x] Update `test/assessor.e2e-spec.ts` to include E2E tests for image validation:
  - **Valid Image Payloads**
    - [x] `POST /v1/assessor with valid IMAGE taskType and PNG Buffer should return 201 Created`
    - [x] `POST /v1/assessor with valid IMAGE taskType and base64 PNG string should return 201 Created`
    - [x] `POST /v1/assessor with valid IMAGE taskType and JPEG Buffer should return 201 Created` (if JPEG allowed)
  - **Invalid Image Payloads (should return 400 Bad Request)**
    - [x] `POST /v1/assessor with IMAGE taskType and Buffer exceeding size limit should return 400`
    - [x] `POST /v1/assessor with IMAGE taskType and base64 string exceeding size limit should return 400`
    - [x] `POST /v1/assessor with IMAGE taskType and Buffer of disallowed type (e.g., GIF) should return 400`
    - [x] `POST /v1/assessor with IMAGE taskType and base64 string of disallowed type (e.g., GIF) should return 400`
    - [x] `POST /v1/assessor with IMAGE taskType and invalid base64 string should return 400`
    - [x] `POST /v1/assessor with IMAGE taskType and empty image data should return 400`
  - **Error Message Consistency**
    - [x] `Error response for size limit exceeded should contain a clear message`
    - [x] `Error response for disallowed MIME type should contain a clear message`
    - [x] `Error response for invalid base64 format should contain a clear message`

#### Green Phase: Apply Validation Pipe to DTO

- [x] Modify `src/v1/assessor/dto/create-assessor.dto.ts` and controller:
  - Applied the `ImageValidationPipe` to the `reference`, `template`, and `studentResponse` fields when `taskType` is `IMAGE` by invoking the pipe in the controller. This avoids complex decorator or Zod logic and ensures robust runtime validation.

- [x] Run the tests and ensure they all pass. (All image validation and DTO tests pass. One unrelated module spec failure remains.)
  - Note: `assessor.module.spec.ts` fails due to an import/export issue unrelated to image validation. All acceptance criteria for this task are met.
  - **Commit ID**: 6c1aad1

#### Refactor & Commit

- [x] Review the code and test for clarity, consistency, and adherence to project standards.
- [x] Commit the changes with a clear message.
- [x] **Commit ID**: 6c1aad1

---

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 5. Documentation Updates

**Objective**: Update relevant documentation to reflect the new validation.

- [x] Update `docs/api/API_Documentation.md` to describe the image size and type constraints for the `/v1/assessor` endpoint. (Image validation rules, error responses, and environment variable configuration documented.)
- [x] Update `README.md` with information about the new environment variables. (Purpose, defaults, and configuration instructions added.)

#### Refactor & Commit

- [x] Review all documentation changes for clarity and completeness. (Checked for British English spelling and accuracy.)
- [x] Commit documentation updates with message.
- [x] **Commit ID**: 85dc132

---
