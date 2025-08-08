# Request & Response Schemas

This document details the data schemas for the Assessment Bot Backend API, validated using Zod.

## Assessment Request (`/v1/assessor`)

The request schema is a discriminated union based on the `taskType` field.

### Base Properties

- `taskType`: (Required) One of `"TEXT"`, `"TABLE"`, or `"IMAGE"`.

### `TEXT` Task

- `reference`: `string` (min 1 char)
- `template`: `string` (min 1 char)
- `studentResponse`: `string` (min 1 char)

### `TABLE` Task

- `reference`: `string` (min 1 char, CSV or other table format)
- `template`: `string` (min 1 char)
- `studentResponse`: `string` (min 1 char, CSV or other table format)

### `IMAGE` Task

- `reference`: `string` or `Buffer`
- `template`: `string` or `Buffer`
- `studentResponse`: `string` or `Buffer`

**`IMAGE` Task Requirements:**

- All three fields (`reference`, `template`, `studentResponse`) must be of the same type (all strings or all Buffers).
- String values **must** be a Data URI (e.g., `data:image/png;base64,...`).
- Image validation rules (size, MIME type) are configured via environment variables.

## Assessment Response

A successful assessment returns a JSON object with three criteria:

```typescript
{
  completeness: AssessmentCriterion,
  accuracy: AssessmentCriterion,
  spag: AssessmentCriterion // Spelling, Punctuation, and Grammar
}
```

Each `AssessmentCriterion` has the following structure:

```typescript
{
  score: number,    // Integer from 0 to 5
  reasoning: string // Explanation for the score
}
```

## Other Schemas

### Health Check (`/health`)

```typescript
{
  status: "ok",
  applicationName: string, // From package.json
  version: string,         // From package.json
  timestamp: string        // ISO 8601 timestamp
}
```

### Authentication Check (`/check-auth`)

```typescript
{
  message: "This is a protected endpoint",
  user: {
    apiKey: "***redacted***"
  }
}
```
