# Exception Filters

This module provides comprehensive error handling and response formatting through custom NestJS exception filters. The filters ensure consistent error responses across the application whilst maintaining security and providing useful debugging information.

## HttpExceptionFilter

The `HttpExceptionFilter` is a global exception filter that catches all errors and formats them into standardised JSON responses. It extends NestJS's `BaseExceptionFilter` to provide enhanced error handling, logging, and security measures.

### Features

- **Universal Error Handling**: Catches all exceptions including HttpExceptions and unexpected errors
- **Standardised Responses**: Formats all errors into consistent JSON structure
- **Security-Aware Logging**: Sanitises sensitive headers before logging
- **Production Safety**: Masks detailed error messages for 5xx errors in production
- **Express Integration**: Handles specific Express.js errors like PayloadTooLargeError
- **Structured Logging**: Provides detailed context for debugging

### Usage

The filter is typically registered globally in the application bootstrap:

```typescript
import { HttpExceptionFilter } from '@/common/http-exception.filter';
import { Logger } from '@nestjs/common';

// In main.ts or app module
const logger = new Logger('HttpExceptionFilter');
app.useGlobalFilters(new HttpExceptionFilter(logger));
```

### Response Format

All error responses follow a consistent structure:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "message": "Validation failed",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["name"],
      "message": "Expected string, received number"
    }
  ]
}
```

### Error Types Handled

#### NestJS HttpExceptions

- Extracts status code and message from the exception
- Preserves Zod validation errors when present
- Handles both string and object response formats

#### Express PayloadTooLargeError

- Specifically handles `entity.too.large` errors
- Returns HTTP 413 status with appropriate message
- Prevents application crashes from large payloads

#### Unknown Exceptions

- Catches any unhandled errors
- Returns HTTP 500 with generic message in production
- Logs full error details for debugging

### Security Features

#### Header Sanitisation

Sensitive headers are redacted before logging:

- `authorization`: Replaced with `[REDACTED]`
- `cookie`: Replaced with `[REDACTED]`
- `x-api-key`: Replaced with `[REDACTED]`

#### Production Error Masking

- 5xx errors show generic "Internal server error" message in production
- 4xx errors retain their original messages
- Development environments show full error details

### Logging Behaviour

The filter provides contextual logging with different levels:

#### Error Logs (5xx status codes)

```typescript
{
  method: 'POST',
  path: '/api/users',
  ip: '192.168.1.1',
  headers: { /* sanitised headers */ },
  userAgent: 'Mozilla/5.0...'
}
```

#### Warning Logs (4xx status codes and PayloadTooLarge)

Same context as error logs but at warning level for client errors.

### Zod Validation Integration

The filter seamlessly integrates with Zod validation errors:

```typescript
interface ZodErrorDetail {
  code: string;
  expected?: string;
  received?: string;
  path: (string | number)[];
  message: string;
}
```

When validation fails, these detailed errors are included in the response (except in production for 5xx errors).

### Constructor Parameters

- `logger`: A NestJS Logger instance for structured logging

### Error Processing Flow

1. **Exception Detection**: Identifies the type of exception
2. **Special Case Handling**: Processes PayloadTooLargeError separately
3. **Detail Extraction**: Extracts status, message, and validation errors
4. **Security Processing**: Applies production masking if needed
5. **Context Logging**: Logs with sanitised request context
6. **Response Formation**: Constructs standardised JSON response

### Implementation Details

#### Type Guards

- `isPayloadTooLargeError()`: Identifies Express payload errors
- Proper type checking for exception objects

#### Message Processing

- Handles both string and array message formats
- Joins multiple messages with commas
- Provides fallback messages for malformed exceptions

## Dependencies

- **NestJS Common**: For exception filter interfaces and HTTP status codes
- **NestJS Core**: For BaseExceptionFilter inheritance
- **Express**: For Request and Response types

## Best Practices

- **Always Use Globally**: Register as a global filter for consistent error handling
- **Provide Logger**: Pass a configured Logger instance for proper context
- **Environment Configuration**: Ensure `NODE_ENV` is set correctly for production masking
- **Error Monitoring**: Consider integrating with external error monitoring services
- **Testing**: Test with various exception types to ensure proper handling
