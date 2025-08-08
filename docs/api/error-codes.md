# Error Codes

This document details the error handling mechanisms and HTTP status codes returned by the Assessment Bot Backend API, including error formats, common scenarios, and troubleshooting guidance.

## Overview

The API uses a comprehensive error handling system built on NestJS's exception filters. All errors are standardised into a consistent JSON format with detailed information to help developers understand and resolve issues quickly.

## Standard Error Response Format

All API errors follow this standardised structure:

```typescript
{
  statusCode: number,        // HTTP status code
  timestamp: string,         // ISO 8601 timestamp when error occurred
  path: string,             // Request path that caused the error
  message: string,          // Human-readable error description
  errors?: ZodErrorDetail[] // Optional detailed validation errors
}
```

### Example Error Response

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Validation failed",
  "errors": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "String must contain at least 1 character(s)",
      "path": ["reference"]
    }
  ]
}
```

## HTTP Status Codes

### 200 - OK

Successful requests return appropriate 200-level status codes:

- `200 OK`: Successful GET requests (health check, auth check)
- `201 Created`: Successful assessment creation

### 400 - Bad Request

Returned when the request is malformed or fails validation.

**Common Scenarios:**

#### Schema Validation Failures

Invalid request body that doesn't match the expected schema:

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Validation failed",
  "errors": [
    {
      "code": "invalid_enum_value",
      "options": ["TEXT", "TABLE", "IMAGE"],
      "path": ["taskType"],
      "message": "Invalid enum value. Expected 'TEXT' | 'TABLE' | 'IMAGE', received 'INVALID'"
    }
  ]
}
```

#### Missing Required Fields

When required fields are omitted:

# Error Codes

This document details the common error codes and response formats for the Assessment Bot Backend API.

## Standard Error Response Format

All API errors follow a standardised JSON structure:

```typescript
{
  statusCode: number,        // HTTP status code
  timestamp: string,         // ISO 8601 timestamp of the error
  path: string,              // Request path that caused the error
  message: string | string[],// Error description or validation messages
  error?: string             // Short error description (e.g., "Bad Request")
}
```

When validation fails, the `message` field will often contain an array of detailed error objects from Zod.

## Common HTTP Status Codes

### 400 - Bad Request

Returned when the request is malformed or fails validation. This is the most common client-side error.

**Common Causes:**

- **Invalid `taskType`**: e.g., `"taskType": "INVALID"`
- **Missing Required Fields**: e.g., omitting `reference`.
- **Incorrect Data Types**: e.g., providing a `number` where a `string` is expected.
- **Image Validation Failures**:
  - Image size exceeds the `MAX_IMAGE_UPLOAD_SIZE_MB` limit.
  - Image MIME type is not in the `ALLOWED_IMAGE_MIME_TYPES` list.
- **Inconsistent `IMAGE` Task Types**: `reference`, `template`, and `studentResponse` must all be of the same type (all strings or all Buffers).

**Example (Invalid Enum)**

```json
{
  "statusCode": 400,
  "message": [
    {
      "code": "invalid_enum_value",
      "options": ["TEXT", "TABLE", "IMAGE"],
      "path": ["taskType"],
      "message": "Invalid enum value. Expected 'TEXT' | 'TABLE' | 'IMAGE', received 'INVALID'"
    }
  ],
  "error": "Bad Request",
  "timestamp": "2025-08-08T10:00:00.000Z",
  "path": "/v1/assessor"
}
```

### 401 - Unauthorized

Returned when authentication fails.

**Common Causes:**

- **Missing API Key**: The `Authorization` header is not provided.
- **Invalid API Key**: The provided API key is incorrect.
- **Malformed Header**: The `Authorization` header is not in the format `Bearer <key>`.

**Example Response**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2025-08-08T10:00:00.000Z",
  "path": "/v1/assessor"
}
```

### 413 - Payload Too Large

Returned when the request body exceeds the server's configured size limit.

### 429 - Too Many Requests

Returned when the rate limit is exceeded. The response will include a `Retry-After` header indicating how many seconds to wait before retrying.

### 500 - Internal Server Error

Returned for unexpected, server-side errors. In production, the message is a generic "Internal server error". In development, it may contain a stack trace.

#### Image Validation Failures

For IMAGE task types with invalid image data:

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Image exceeds maximum size of 1 MB"
}
```

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Disallowed MIME type: image/gif. Allowed types: image/png"
}
```

#### Type Consistency Errors

For IMAGE tasks where reference, template, and studentResponse have inconsistent types:

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "For IMAGE taskType, reference, template, and studentResponse must all be of the same type (either all strings or all Buffers)."
}
```

### 401 - Unauthorized

Returned when authentication fails or is missing.

**Common Scenarios:**

#### Missing API Key

No Authorization header provided:

```json
{
  "statusCode": 401,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Unauthorized"
}
```

#### Invalid API Key

Incorrect or malformed API key:

```json
{
  "statusCode": 401,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Unauthorized"
}
```

#### Malformed Authorization Header

Incorrect header format (missing "Bearer" prefix):

```json
{
  "statusCode": 401,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Unauthorized"
}
```

### 413 - Payload Too Large

Returned when the request body exceeds the configured size limit.

```json
{
  "statusCode": 413,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Payload Too Large"
}
```

**Configuration:**

- Global payload limit is configured via the ConfigService
- Specific image size limits are enforced by the ImageValidationPipe

### 429 - Too Many Requests

Returned when rate limiting thresholds are exceeded.

```json
{
  "statusCode": 429,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "ThrottlerException: Too Many Requests"
}
```

**Additional Headers:**
Rate-limited responses include a `Retry-After` header indicating when requests can resume:

```http
Retry-After: 8
```

### 500 - Internal Server Error

Returned for unexpected server-side errors.

**Production Behaviour:**

```json
{
  "statusCode": 500,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Internal server error"
}
```

**Development Behaviour:**
In non-production environments, more detailed error information may be provided for debugging purposes.

## Validation Error Details

### Zod Error Structure

When validation fails, the `errors` array contains detailed information about each validation failure:

```typescript
{
  code: string,              // Zod error code (e.g., "too_small", "invalid_type")
  expected?: string,         // Expected type/value
  received?: string,         // Actual received type/value
  path: (string | number)[], // Path to the field that failed
  message: string           // Human-readable error description
}
```

### Common Validation Error Codes

#### `invalid_type`

Field has wrong data type:

```json
{
  "code": "invalid_type",
  "expected": "string",
  "received": "number",
  "path": ["reference"],
  "message": "Expected string, received number"
}
```

#### `too_small`

String/number/array is below minimum requirement:

```json
{
  "code": "too_small",
  "minimum": 1,
  "type": "string",
  "inclusive": true,
  "path": ["template"],
  "message": "String must contain at least 1 character(s)"
}
```

#### `invalid_enum_value`

Value not in allowed enum options:

```json
{
  "code": "invalid_enum_value",
  "options": ["TEXT", "TABLE", "IMAGE"],
  "path": ["taskType"],
  "message": "Invalid enum value. Expected 'TEXT' | 'TABLE' | 'IMAGE', received 'INVALID'"
}
```

#### `invalid_union`

Discriminated union validation failure:

```json
{
  "code": "invalid_union",
  "unionErrors": [...],
  "path": [],
  "message": "Invalid input"
}
```

## Error Logging

### Logging Behaviour

The error filter logs errors with appropriate levels:

- **4xx Errors**: Logged as warnings with request context
- **5xx Errors**: Logged as errors with full stack traces
- **Sensitive Data**: Headers like Authorization and cookies are redacted in logs

### Log Context

Error logs include detailed request context:

```typescript
{
  method: string,           // HTTP method
  path: string,            // Request path
  ip: string,              // Client IP address
  headers: object,         // Sanitised request headers
  userAgent: string        // Client user agent
}
```

## Security Considerations

### Production Error Sanitisation

In production environments (`NODE_ENV=production`):

- 5xx error messages are sanitised to "Internal server error"
- Detailed stack traces are not exposed to clients
- Sensitive information is redacted from logs

### Header Sanitisation

The following headers are automatically redacted in logs:

- `authorization`
- `cookie`
- `x-api-key`

## Troubleshooting Guide

### Common Issues and Solutions

#### Validation Errors

**Issue**: Request fails with 400 Bad Request and validation errors
**Solution**:

1. Check the `errors` array for specific field issues
2. Verify data types match the expected schema
3. Ensure required fields are present and non-empty
4. For IMAGE tasks, verify all image fields have consistent types

#### Authentication Errors

**Issue**: Request fails with 401 Unauthorised
**Solution**:

1. Ensure Authorization header is present: `Authorization: Bearer <api_key>`
2. Verify API key is valid and properly configured
3. Check for typos in the Bearer token format

#### Rate Limiting Errors

**Issue**: Request fails with 429 Too Many Requests  
**Solution**:

1. Check the `Retry-After` header for wait time
2. Implement exponential backoff in client applications
3. Review rate limiting configuration if limits seem too restrictive

#### Image Upload Errors

**Issue**: Image validation fails with 400 Bad Request
**Solution**:

1. Verify image size is within the configured limit (default 1 MB)
2. Check image MIME type is in the allowed list (default: image/png)
3. Ensure base64 encoding is correct for string format
4. For Data URI format, include proper MIME type prefix

#### Payload Size Errors

**Issue**: Request fails with 413 Payload Too Large
**Solution**:

1. Reduce request body size
2. For images, compress or resize before upload
3. Consider chunking large requests if supported by client

### Best Practices

1. **Always Handle Errors**: Implement proper error handling in client applications
2. **Parse Error Details**: Use the `errors` array for specific validation feedback
3. **Respect Rate Limits**: Implement appropriate retry logic with backoff
4. **Log Client Errors**: Log error responses for debugging and monitoring
5. **Validate Before Sending**: Pre-validate data on the client side where possible
