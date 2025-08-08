# Validation Pipes

This module provides custom NestJS pipes for input validation and transformation. The validation pipes ensure data integrity and security by validating incoming requests against defined schemas and constraints.

## ZodValidationPipe

The `ZodValidationPipe` is a custom NestJS pipe that leverages Zod schemas for runtime validation of incoming data. It provides comprehensive validation with detailed error reporting and production-safe error handling.

### Features

- **Zod Schema Integration**: Uses Zod schemas for type-safe validation
- **Production Security**: Masks detailed validation errors in production environments
- **Flexible Usage**: Can be applied to individual parameters, methods, or globally
- **Detailed Logging**: Logs validation failures for debugging purposes

### Usage

```typescript
import { ZodValidationPipe } from '@/common/zod-validation.pipe';
import { z } from 'zod';

// Define a Zod schema
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(120),
});

// Use in a controller method
@Post('users')
async createUser(
  @Body(new ZodValidationPipe(createUserSchema)) userData: CreateUserDto
) {
  return this.userService.create(userData);
}
```

### Error Handling

The pipe throws a `BadRequestException` when validation fails:

- **Development**: Returns detailed validation errors with field paths and specific error messages
- **Production**: Returns generic "Invalid input" message to prevent information leakage

### Constructor Parameters

- `schema` (optional): The Zod schema to validate against. If not provided, the pipe returns the input value unchanged.

## ImageValidationPipe

The `ImageValidationPipe` specialises in validating image uploads, supporting both binary buffers and base64-encoded strings. It enforces size limits, format restrictions, and security measures.

### Features

- **Multi-format Support**: Validates both Buffer objects and base64 Data URIs
- **Size Validation**: Enforces configurable maximum file size limits
- **MIME Type Checking**: Restricts uploads to allowed image formats
- **Security Measures**: Includes ReDoS protection and input sanitisation
- **Base64 Processing**: Properly parses and validates Data URI format

### Usage

```typescript
import { ImageValidationPipe } from '@/common/pipes/image-validation.pipe';

@Post('upload')
async uploadImage(
  @Body('image', ImageValidationPipe) imageData: Buffer | string
) {
  return this.imageService.processImage(imageData);
}
```

### Validation Rules

#### For Buffer Inputs

- Must not be empty
- Must not exceed the maximum file size (configured via `MAX_IMAGE_UPLOAD_SIZE_MB`)
- Must have a MIME type in the allowed list (configured via `ALLOWED_IMAGE_MIME_TYPES`)

#### For Base64 String Inputs

- Must not exceed length limit (10MB) to prevent ReDoS attacks
- Must start with `data:image/` prefix
- Must be properly base64-encoded
- Must decode to a non-empty buffer
- Must not exceed the configured file size limit
- Must have an allowed MIME type

### Configuration

The pipe uses the following configuration values from `ConfigService`:

- `MAX_IMAGE_UPLOAD_SIZE_MB`: Maximum allowed image size in megabytes
- `ALLOWED_IMAGE_MIME_TYPES`: Array of permitted MIME types (e.g., `['image/jpeg', 'image/png']`)

### Error Messages

The pipe provides specific error messages for different validation failures:

- `"Empty image buffer is not allowed."` - For empty buffers or base64 data
- `"Image size exceeds the limit of XMB."` - For oversized files
- `"Invalid image type."` - For unsupported MIME types
- `"Invalid base64 image format."` - For malformed base64 strings
- `"Base64 image string is too large."` - For excessive string lengths

## Dependencies

- **NestJS Common**: For pipe interfaces and exceptions
- **Zod**: For schema validation (ZodValidationPipe)
- **mime-detect**: For MIME type detection (ImageValidationPipe)
- **validator**: For base64 validation (ImageValidationPipe)

## Security Considerations

Both pipes implement security best practices:

- **Input Sanitisation**: Validates all input before processing
- **Error Masking**: Prevents information leakage in production
- **Size Limits**: Prevents resource exhaustion attacks
- **Type Checking**: Ensures data conforms to expected formats
- **ReDoS Protection**: Guards against regular expression denial of service
