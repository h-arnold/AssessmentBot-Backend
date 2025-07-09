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
  ```json
  {
    "taskType": "TEXT",
    "reference": "string | Buffer (base64 encoded for images)",
    "template": "string | Buffer (base64 encoded for images)",
    "studentResponse": "string | Buffer (base64 encoded for images)"
  }
  ```
  - `taskType`: (Required) The type of assessment task. Must be one of `TEXT`, `TABLE`, or `IMAGE`.
  - `reference`: (Required) The reference solution or content for the assessment. Can be a string (for TEXT/TABLE) or a base64 encoded string/Buffer (for IMAGE).
  - `template`: (Required) The template or instructions for the assessment. Can be a string (for TEXT/TABLE) or a base64 encoded string/Buffer (for IMAGE).
  - `studentResponse`: (Required) The student's response to be assessed. Can be a string (for TEXT/TABLE) or a base64 encoded string/Buffer (for IMAGE).

- **Response (201 Created):**
  ```json
  {
    "message": "Assessment created successfully"
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
