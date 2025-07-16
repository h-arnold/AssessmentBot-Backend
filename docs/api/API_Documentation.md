# API Documentation

## Introduction

This document provides an overview of the Assessment Bot Backend API, detailing available endpoints, authentication methods, and data structures.

## Base URL

The base URL for the API is `http://localhost:3000` when running locally.

## Authentication

API access is secured using API Keys. Provide your API key in the `Authorization` header as a Bearer token.

**Example:**

`Authorization: Bearer your_api_key_here`

## Endpoints

### Assessor Endpoint

This endpoint is responsible for initiating an assessment. It accepts a JSON payload containing the details of the assessment task, including the type of task (text, table, or image), a reference solution, a template, and the student's response. The endpoint is secured with an API key.

- **URL:** `/v1/assessor`
- **Method:** `POST`
- **Description:** Initiates an assessment based on the provided task details.
- **Request Body:** `application/json`

  **Schema:**

  ```json
  {
    "taskType": "TEXT | TABLE | IMAGE",
    "reference": "string | Buffer (for IMAGE: base64-encoded string, **with a Data URI prefix**)",
    "template": "string | Buffer (for IMAGE: base64-encoded string, **with a Data URI prefix**)",
    "studentResponse": "string | Buffer (for IMAGE: base64-encoded string, **with a Data URI prefix**)"
  }
  ```

  - `taskType`: (Required) The type of assessment task. Must be one of `TEXT`, `TABLE`, or `IMAGE`.
  - `reference`: (Required) The reference solution or content for the assessment. Can be a string (for TEXT/TABLE) or, for IMAGE, a base64-encoded string or Buffer. For IMAGE, both raw base64 strings (no prefix) and Data URI strings (e.g., `data:image/png;base64,...`) are accepted.
  - `template`: (Required) The template or instructions for the assessment. Can be a string (for TEXT/TABLE) or, for IMAGE, a base64-encoded string or Buffer. For IMAGE, both raw base64 strings (no prefix) and Data URI strings are accepted.
  - `studentResponse`: (Required) The student's response to be assessed. Can be a string (for TEXT/TABLE) or, for IMAGE, a base64-encoded string or Buffer. For IMAGE, both raw base64 strings (no prefix) and Data URI strings are accepted.

  **Image Validation**

  When `taskType` is `IMAGE`, the following validation rules apply to the `reference`, `template`, and `studentResponse` fields:
  - **Maximum Image Size:**
    - The maximum allowed image size is configured via the `MAX_IMAGE_UPLOAD_SIZE_MB` environment variable (default: 1 MB).
    - Any image exceeding this size will be rejected with a `400 Bad Request` error.
  - **Allowed Image MIME Types:**
    - Only images with MIME types listed in the `ALLOWED_IMAGE_MIME_TYPES` environment variable (comma-separated, default: `image/png`) are accepted.
    - Disallowed types (e.g., GIF, BMP) will be rejected with a `400 Bad Request` error.
  - **Supported Formats:**
    - Images may be provided as Buffers or base64-encoded strings.
    - For base64-encoded images, you must include the Data URI prefix:
      1. **Data URI string**:
         - Example: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...`
    - The pipe will infer the MIME type and size, and reject invalid or malformed images.
  - **Error Responses:**
    - `400 Bad Request`: Returned if the image is too large, of a disallowed type, or malformed. Error messages will indicate the reason (e.g., "Image exceeds maximum size", "Disallowed MIME type").

  **Example (`TEXT` task):**

  ```json
  {
    "taskType": "TEXT",
    "reference": "The quick brown fox jumps over the lazy dog.",
    "template": "Write a sentence about a fox.",
    "studentResponse": "A fox is a mammal."
  }
  ```

  **Example (`IMAGE` task, raw base64):**

  ```json
  {
    "taskType": "IMAGE",
    "reference": "iVBORw0KGgoAAAANSUhEUgAA...", // base64 string only
    "template": "iVBORw0KGgoAAAANSUhEUgAA...",
    "studentResponse": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
  ```

  **Example (`IMAGE` task, Data URI):**

  ```json
  {
    "taskType": "IMAGE",
    "reference": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "template": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "studentResponse": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
  ```

- **Response (201 Created):**

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

- **Error Responses:**
  - `400 Bad Request`: If the request body is invalid (e.g., missing required fields, incorrect data types, or inconsistent types for `IMAGE` taskType fields).
  - `401 Unauthorized`: If no API key is provided or the API key is invalid.

### Health Check

The health check endpoint provides information about the application's status.

- **URL:** `/health`
- **Method:** `GET`
- **Description:** Returns the current status of the application, including its name, version, and a timestamp.
- **Response:**
  ```json
  {
    "status": "ok",
    "applicationName": "Assessment Bot Backend",
    "version": "0.0.1",
    "timestamp": "2025-07-07T12:00:00Z"
  }
  ```
  _(Note: The `timestamp` will reflect the actual time of the request, and `applicationName` and `version` are retrieved dynamically from `package.json`.)_

## Error Handling

Details on error handling and common error codes will be provided here as the API develops.
