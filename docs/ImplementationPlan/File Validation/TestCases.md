# File Validation Test Cases

This document outlines comprehensive test scenarios for the image file size and type validation functionality.

## 1. Environment Configuration Tests

These tests validate the correct loading and parsing of the new environment variables related to image validation.

- **MAX_IMAGE_UPLOAD_SIZE_MB**
  - **Test**: `ConfigService should load MAX_IMAGE_UPLOAD_SIZE_MB as a number`
    - Set `MAX_IMAGE_UPLOAD_SIZE_MB` in `.env` to a valid number (e.g., `2`).
    - Verify `ConfigService.get('MAX_IMAGE_UPLOAD_SIZE_MB')` returns `2` (number).
  - **Test**: `ConfigService should use default MAX_IMAGE_UPLOAD_SIZE_MB if not set`
    - Unset `MAX_IMAGE_UPLOAD_SIZE_MB`.
    - Verify `ConfigService.get('MAX_IMAGE_UPLOAD_SIZE_MB')` returns `1` (default number).
  - **Test**: `ConfigService should reject invalid MAX_IMAGE_UPLOAD_SIZE_MB`
    - Set `MAX_IMAGE_UPLOAD_SIZE_MB` to a non-numeric string (e.g., `"abc"`).
    - Expect application startup to fail with a Zod validation error.

- **ALLOWED_IMAGE_MIME_TYPES**
  - **Test**: `ConfigService should load ALLOWED_IMAGE_MIME_TYPES as an array of strings`
    - Set `ALLOWED_IMAGE_MIME_TYPES` to `"image/png,image/jpeg"`.
    - Verify `ConfigService.get('ALLOWED_IMAGE_MIME_TYPES')` returns `['image/png', 'image/jpeg']`.
  - **Test**: `ConfigService should use default ALLOWED_IMAGE_MIME_TYPES if not set`
    - Unset `ALLOWED_IMAGE_MIME_TYPES`.
    - Verify `ConfigService.get('ALLOWED_IMAGE_MIME_TYPES')` returns `['image/png']` (default array).
  - **Test**: `ConfigService should handle single ALLOWED_IMAGE_MIME_TYPES`
    - Set `ALLOWED_IMAGE_MIME_TYPES` to `"image/gif"`.
    - Verify `ConfigService.get('ALLOWED_IMAGE_MIME_TYPES')` returns `['image/gif']`.

- **Global Payload Limit Calculation (getGlobalPayloadLimit)**
  - **Test**: `getGlobalPayloadLimit should calculate correctly for default MAX_IMAGE_UPLOAD_SIZE_MB`
    - Set `MAX_IMAGE_UPLOAD_SIZE_MB` to `1`.
    - Verify `ConfigService.getGlobalPayloadLimit()` returns approximately `5MB` (accounting for base64 overhead and buffer).
  - **Test**: `getGlobalPayloadLimit should calculate correctly for a different MAX_IMAGE_UPLOAD_SIZE_MB`
    - Set `MAX_IMAGE_UPLOAD_SIZE_MB` to `2`.
    - Verify `ConfigService.getGlobalPayloadLimit()` returns approximately `9MB`.

## 2. ImageValidationPipe Unit Tests

These tests validate the core logic of the `ImageValidationPipe` for various inputs.

- **Initialization**
  - **Test**: `ImageValidationPipe should be defined`
  - **Test**: `ImageValidationPipe should inject ConfigService`

- **Valid Inputs (should pass)**
  - **Test**: `Should allow a valid PNG Buffer within size limit`
  - **Test**: `Should allow a valid JPEG Buffer within size limit` (if JPEG is allowed in config)
  - **Test**: `Should allow a valid base64 PNG string within size limit`
  - **Test**: `Should allow a valid base64 JPEG string within size limit` (if JPEG is allowed in config)
  - **Test**: `Should allow non-image string inputs (e.g., for TEXT/TABLE task types)`
  - **Test**: `Should allow non-Buffer/non-string inputs (e.g., numbers, objects) to pass through`

- **Invalid Inputs (should throw BadRequestException)**
  - **Test**: `Should reject a Buffer exceeding MAX_IMAGE_UPLOAD_SIZE_MB`
  - **Test**: `Should reject a base64 string exceeding MAX_IMAGE_UPLOAD_SIZE_MB`
  - **Test**: `Should reject a Buffer with a disallowed MIME type`
  - **Test**: `Should reject a base64 string with a disallowed MIME type`
  - **Test**: `Should reject an invalid base64 string format`
  - **Test**: `Should reject an empty Buffer`
  - **Test**: `Should reject an empty base64 string`
  - **Test**: `Should reject a Buffer that cannot be identified as an image type`

- **Edge Cases**
  - **Test**: `Should handle MAX_IMAGE_UPLOAD_SIZE_MB = 0 (reject all images)`
  - **Test**: `Should handle empty ALLOWED_IMAGE_MIME_TYPES (reject all images)`

## 3. Assessor Endpoint E2E Tests

These tests validate the end-to-end behavior of the `/v1/assessor` endpoint with image validation.

- **Valid Image Payloads**
  - **Test**: `POST /v1/assessor with valid IMAGE taskType and PNG Buffer should return 201 Created`
  - **Test**: `POST /v1/assessor with valid IMAGE taskType and base64 PNG string should return 201 Created`
  - **Test**: `POST /v1/assessor with valid IMAGE taskType and JPEG Buffer should return 201 Created` (if JPEG allowed)

- **Invalid Image Payloads (should return 400 Bad Request)**
  - **Test**: `POST /v1/assessor with IMAGE taskType and Buffer exceeding size limit should return 400`
  - **Test**: `POST /v1/assessor with IMAGE taskType and base64 string exceeding size limit should return 400`
  - **Test**: `POST /v1/assessor with IMAGE taskType and Buffer of disallowed type (e.g., GIF) should return 400`
  - **Test**: `POST /v1/assessor with IMAGE taskType and base64 string of disallowed type (e.g., GIF) should return 400`
  - **Test**: `POST /v1/assessor with IMAGE taskType and invalid base64 string should return 400`
  - **Test**: `POST /v1/assessor with IMAGE taskType and empty image data should return 400`

- **Global Payload Limit Exceeded (should return 413 Payload Too Large)**
  - **Test**: `POST /v1/assessor with payload exceeding global limit should return 413`

- **Error Message Consistency**
  - **Test**: `Error response for size limit exceeded should contain a clear message`
  - **Test**: `Error response for disallowed MIME type should contain a clear message`
  - **Test**: `Error response for invalid base64 format should contain a clear message`
