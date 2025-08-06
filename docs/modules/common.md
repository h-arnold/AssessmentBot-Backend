# Common Module

The Common Module (`src/common/common.module.ts`) provides shared utilities, filters, and components that are used across the AssessmentBot-Backend application. It centralises common functionality to promote code reuse and maintain consistency.

## Overview

The Common Module serves as a central hub for:

- **Global error handling**: Standardised HTTP exception filtering
- **JSON processing**: Robust JSON parsing and repair utilities
- **Input validation**: Zod-based validation pipes
- **Image validation**: File upload validation and security
- **Utility functions**: File operations and type guards

## Module Structure

```typescript
@Module({
  imports: [LoggerModule],
  providers: [
    Logger,
    JsonParserUtil,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  exports: [Logger, JsonParserUtil],
})
export class CommonModule {}
```

## Core Components

### Global Exception Filter

The `HttpExceptionFilter` provides comprehensive error handling for the entire application:

#### Features

- **Standardised responses**: All errors formatted as consistent JSON
- **Security-aware**: Sanitises sensitive information in production
- **Comprehensive logging**: Different log levels for 4xx vs 5xx errors
- **Express integration**: Special handling for Express-specific errors (e.g., PayloadTooLarge)

#### Error Response Format

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-08T10:30:45.123Z",
  "path": "/api/v1/assess",
  "message": "Validation failed",
  "errors": [
    {
      "code": "invalid_type",
      "path": ["images"],
      "message": "Expected array, received string"
    }
  ]
}
```

#### Security Features

- **Header redaction**: Automatically redacts authorization, cookie, and API key headers
- **Production message masking**: 5xx errors show generic "Internal server error" in production
- **IP and User-Agent logging**: Request context captured for debugging

### JSON Processing Utilities

The `JsonParserUtil` provides robust JSON parsing with repair capabilities:

#### Key Features

- **Malformed JSON repair**: Uses `jsonrepair` library to fix common JSON issues
- **Markdown extraction**: Automatically extracts JSON from ```json code blocks
- **Bracket trimming**: Extracts JSON content from surrounding text
- **Structured validation**: Ensures parsed result is an object or array

#### Usage Examples

````typescript
// Parse JSON from markdown
const result = jsonParser.parse('```json\n{"key": "value"}\n```');

// Extract JSON from mixed content
const result = jsonParser.parse('Some text {"valid": "json"} more text');

// Repair malformed JSON
const result = jsonParser.parse('{"trailing": "comma",}');
````

### Validation Pipes

#### ZodValidationPipe

A flexible validation pipe that uses Zod schemas for input validation:

```typescript
// Usage in controller
@Post('assess')
@UsePipes(new ZodValidationPipe(assessmentSchema))
async assess(@Body() data: AssessmentRequest) {
  // data is now validated and typed
}
```

**Features:**

- **Type safety**: Full TypeScript integration with Zod schemas
- **Environment-aware**: Detailed errors in development, generic in production
- **Comprehensive logging**: Validation failures logged with context

#### ImageValidationPipe

Specialised pipe for validating image uploads:

**Supported formats:**

- **Binary buffers**: Direct file uploads
- **Base64 strings**: Data URI format (`data:image/png;base64,iVBOR...`)

**Validation rules:**

- File size limits (configured via `MAX_IMAGE_UPLOAD_SIZE_MB`)
- MIME type restrictions (configured via `ALLOWED_IMAGE_MIME_TYPES`)
- Security checks (path traversal prevention, ReDoS mitigation)

**Example usage:**

```typescript
@Post('upload')
async uploadImage(@Body('image', ImageValidationPipe) image: Buffer | string) {
  // image is validated for size, type, and security
}
```

## Utility Functions

### File Operations

#### `getCurrentDirname(fallbackDir?: string): string`

Cross-environment directory path resolution:

- **ESM runtime**: Uses `import.meta.url` for accurate path resolution
- **Jest testing**: Falls back to `process.cwd()` or provided fallback
- **Type-safe**: Handles environment differences gracefully

#### `readMarkdown(name: string, basePath?: string): Promise<string>`

Secure markdown file reading with built-in security features:

```typescript
// Read template file securely
const template = await readMarkdown('assessment.md', 'src/prompt/templates');
```

**Security features:**

- **Path traversal prevention**: Rejects `..` sequences
- **Extension validation**: Only `.md` files allowed
- **Base path enforcement**: Ensures files stay within allowed directories

### Type Guards

#### `isSystemUserMessage(message: unknown)`

Runtime type validation for LLM message structures:

```typescript
if (isSystemUserMessage(payload)) {
  // TypeScript knows payload is { system: string; user: string }
  console.log(payload.system, payload.user);
}
```

## Error Handling Strategies

### Production vs Development

The Common Module adapts its error handling based on environment:

**Development:**

- Detailed validation errors with full field paths
- Complete stack traces in logs
- Descriptive error messages

**Production:**

- Generic error messages for security
- Sanitised headers in logs
- Minimal client-facing error details

### Logging Integration

All components use the centralised Logger from `nestjs-pino`:

```typescript
private readonly logger = new Logger(ComponentName.name);

// Structured logging with context
this.logger.warn({ errors }, 'Validation failed');
this.logger.error(context, message, stackTrace);
```

## Configuration Dependencies

The Common Module relies on several environment variables:

- `MAX_IMAGE_UPLOAD_SIZE_MB`: Maximum image file size
- `ALLOWED_IMAGE_MIME_TYPES`: Permitted image MIME types
- `NODE_ENV`: Environment mode (affects error detail level)

## Usage in Other Modules

### Importing the Common Module

```typescript
import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  // Now has access to Logger and JsonParserUtil
})
export class FeatureModule {}
```

### Using Exported Services

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { JsonParserUtil } from '../common/json-parser.util';

@Injectable()
export class MyService {
  constructor(
    private readonly logger: Logger,
    private readonly jsonParser: JsonParserUtil,
  ) {}

  async processData(input: string) {
    try {
      const parsed = this.jsonParser.parse(input);
      this.logger.log('Successfully parsed JSON');
      return parsed;
    } catch (error) {
      this.logger.error('JSON parsing failed', error);
      throw error;
    }
  }
}
```

## Testing Considerations

The Common Module is designed with testing in mind:

### Mocking Utilities

```typescript
// Mock JsonParserUtil in tests
const mockJsonParser = {
  parse: jest.fn().mockReturnValue({ test: 'data' }),
};

// Mock Logger
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
```

### Environment-specific Behaviour

Test files can override `NODE_ENV` to test different error handling modes:

```typescript
describe('Error handling', () => {
  it('should mask errors in production', () => {
    process.env.NODE_ENV = 'production';
    // Test production error masking
  });
});
```

## Dependencies

The Common Module depends on:

- **@nestjs/common** - Core NestJS functionality
- **@nestjs/core** - Global filters and providers
- **nestjs-pino** - Structured logging
- **jsonrepair** - JSON repair functionality
- **zod** - Schema validation
- **mime-detect** - File type detection
- **validator** - String validation utilities

## Related Documentation

- [App Module](app.md) - How Common Module is integrated globally
- [Config Module](config.md) - Configuration dependencies
- [Input Validation](../security/validation.md) - Validation strategy details
- [Error Handling](../api/error-codes.md) - API error response format
