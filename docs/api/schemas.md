# Request/Response Schemas

This document provides detailed information about the data schemas used by the Assessment Bot Backend API, including request formats, response structures, and validation rules.

## Overview

The API uses [Zod](https://zod.dev/) for comprehensive schema validation and TypeScript type safety. All request and response data structures are strictly validated against predefined schemas to ensure data integrity and provide clear error messages for invalid inputs.

## Assessment Request Schema

### CreateAssessorDto

The main request schema for creating assessments uses a discriminated union based on the `taskType` field. This ensures type safety and appropriate validation rules for each task type.

#### Base Properties

All task types share these common properties:

- `taskType`: **Required** - Must be one of `"TEXT"`, `"TABLE"`, or `"IMAGE"`

#### TEXT Task Type

For text-based assessments:

```typescript
{
  taskType: "TEXT",
  reference: string,        // Min length: 1
  template: string,         // Min length: 1
  studentResponse: string   // Min length: 1
}
```

**Example:**

```json
{
  "taskType": "TEXT",
  "reference": "The quick brown fox jumps over the lazy dog.",
  "template": "Write a sentence about a fox.",
  "studentResponse": "A fox is a mammal."
}
```

#### TABLE Task Type

For table-based assessments:

```typescript
{
  taskType: "TABLE",
  reference: string,        // Min length: 1 (CSV or table format)
  template: string,         // Min length: 1
  studentResponse: string   // Min length: 1 (CSV or table format)
}
```

**Example:**

```json
{
  "taskType": "TABLE",
  "reference": "Header1,Header2\nRow1Col1,Row1Col2",
  "template": "Create a table with two columns and two rows.",
  "studentResponse": "ColA,ColB\nData1,Data2"
}
```

#### IMAGE Task Type

For image-based assessments:

```typescript
{
  taskType: "IMAGE",
  reference: string | Buffer,        // Base64 string or Buffer
  template: string | Buffer,         // Base64 string or Buffer
  studentResponse: string | Buffer,  // Base64 string or Buffer
  images?: Array<{                   // Optional additional images
    path: string,
    mimeType: string
  }>,
  systemPromptFile?: string          // Optional system prompt file
}
```

**Image Field Requirements:**

- All three fields (`reference`, `template`, `studentResponse`) must be the same type (all strings or all Buffers)
- String format can be raw base64 or Data URI format (e.g., `data:image/png;base64,iVBORw0KGgo...`)
- Buffer format accepts raw image data

**Example (Data URI format):**

```json
{
  "taskType": "IMAGE",
  "reference": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "template": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "studentResponse": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
}
```

### Image Validation Rules

When `taskType` is `"IMAGE"`, additional validation applies:

#### Size Limits

- Maximum image size is controlled by the `MAX_IMAGE_UPLOAD_SIZE_MB` environment variable (default: 1 MB)
- Images exceeding this limit will be rejected with a `400 Bad Request` error

#### MIME Type Restrictions

- Allowed MIME types are defined by the `ALLOWED_IMAGE_MIME_TYPES` environment variable (default: `image/png`)
- Multiple types can be specified as a comma-separated list
- Disallowed MIME types will be rejected with a `400 Bad Request` error

#### Format Support

- **Base64 strings**: Can be raw base64 or Data URI format with MIME type prefix
- **Buffers**: Raw binary image data
- The system automatically detects and validates the image format

## Assessment Response Schema

### LlmResponse

All successful assessment requests return a standardised response with three assessment criteria:

```typescript
{
  completeness: AssessmentCriterion,
  accuracy: AssessmentCriterion,
  spag: AssessmentCriterion
}
```

### AssessmentCriterion

Each criterion follows this structure:

```typescript
{
  score: number,    // Integer between 0-5 (inclusive)
  reasoning: string // Non-empty explanation for the score
}
```

**Example Response:**

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

#### Assessment Criteria Definitions

- **Completeness**: Measures how thoroughly the student response addresses all requirements in the template/prompt
- **Accuracy**: Evaluates the factual correctness of the student response against the reference material
- **SPAG**: Assesses Spelling, Punctuation, and Grammar quality in the response

## Health Check Response Schema

The health check endpoint returns:

```typescript
{
  status: "ok",
  applicationName: string,  // From package.json
  version: string,         // From package.json
  timestamp: string        // ISO 8601 timestamp
}
```

**Example:**

```json
{
  "status": "ok",
  "applicationName": "Assessment Bot Backend",
  "version": "0.0.1",
  "timestamp": "2025-01-07T12:00:00.000Z"
}
```

## Authentication Check Response Schema

The authentication verification endpoint returns:

```typescript
{
  message: "Authentication successful",
  user: {
    apiKey: "***redacted***"  // API key is redacted for security
  }
}
```

## Schema Validation

### Validation Process

1. **Request Parsing**: Incoming JSON is parsed by Express
2. **Schema Validation**: Zod validates against the discriminated union schema
3. **Image Validation**: For IMAGE tasks, additional asynchronous validation occurs
4. **Type Safety**: TypeScript ensures compile-time type safety throughout

### Validation Benefits

- **Strict Typing**: Prevents runtime type errors
- **Clear Error Messages**: Detailed feedback for validation failures
- **Consistent Structure**: Uniform data handling across the application
- **Security**: Input sanitisation and validation prevent malformed data

## Common Patterns

### Discriminated Unions

The API uses discriminated unions to provide type-safe handling of different task types while maintaining a single endpoint. This pattern ensures:

- **Type Safety**: Each task type has specific, validated fields
- **Runtime Validation**: Proper validation based on the discriminator field
- **Clear API Contract**: Explicit schemas for each use case

### Environment-Driven Configuration

Many validation rules are configurable via environment variables:

- `MAX_IMAGE_UPLOAD_SIZE_MB`: Image size limits
- `ALLOWED_IMAGE_MIME_TYPES`: Permitted image formats

This allows for deployment-specific configuration without code changes.
