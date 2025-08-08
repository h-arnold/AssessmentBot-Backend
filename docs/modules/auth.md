# Authentication Module

The Authentication Module (`src/auth/`) provides comprehensive API key-based authentication and security for the AssessmentBot-Backend application, implementing robust validation and authorisation mechanisms.

## Overview

The Authentication Module serves as the security foundation that:

- Implements API key-based authentication using Passport.js strategies
- Provides secure Bearer token validation with comprehensive format checking
- Manages API key lifecycle and validation through dedicated services
- Offers reusable guards for protecting routes and controllers
- Implements detailed logging and security monitoring
- Supports multiple API keys with centralised configuration management

## Module Structure

```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'bearer' }),
    ConfigModule,
  ],
  providers: [ApiKeyStrategy, ApiKeyGuard, ApiKeyService],
  exports: [ApiKeyStrategy, ApiKeyGuard, ApiKeyService],
})
export class AuthModule {}
```

## Key Components

### 1. ApiKeyStrategy

**Location:** `src/auth/api-key.strategy.ts`

Implements the `passport-http-bearer` strategy for API key authentication:

**Features:**

- **Bearer Token Validation:** Validates `Authorization: Bearer <token>` headers
- **Malformed Scheme Detection:** Rejects malformed Bearer schemes (e.g., lowercase `bearer`)
- **Security Logging:** Logs authentication attempts and security warnings
- **Request Context:** Provides full Express request object to validation logic

```typescript
async validate(req: Request, apiKey: string): Promise<User> {
  const authHeader = req.headers.authorization;

  // Security check for malformed Bearer scheme
  if (authHeader && !authHeader.startsWith('Bearer ')) {
    this.logger.warn(`Malformed Bearer scheme detected: "${authHeader.split(' ')[0]}"`);
    throw new UnauthorizedException('Malformed Bearer scheme.');
  }

  const user = await this.apiKeyService.validate(apiKey);
  if (!user) {
    throw new UnauthorizedException();
  }
  return user;
}
```

### 2. ApiKeyService

**Location:** `src/auth/api-key.service.ts`

Core service responsible for API key validation and management:

**Key Responsibilities:**

- **Configuration Loading:** Loads valid API keys from environment configuration
- **Format Validation:** Enforces API key format rules (length, character set)
- **Authorisation Check:** Validates keys against configured valid keys
- **Security Logging:** Comprehensive logging of authentication events

**Validation Rules:**

- **Minimum Length:** 10 characters minimum
- **Character Set:** Alphanumeric characters, underscores, and hyphens only (`^[a-zA-Z0-9_-]+$`)
- **Type Safety:** Uses Zod schema validation for robust type checking

```typescript
validate(apiKey: unknown): User | null {
  const apiKeySchema = z
    .string()
    .min(10)
    .regex(/^[a-zA-Z0-9_-]+$/);

  const parsed = apiKeySchema.safeParse(apiKey);
  if (!parsed.success) {
    throw new UnauthorizedException('Invalid API key');
  }

  const isValid = this.apiKeys.includes(parsed.data);
  if (isValid) {
    return { apiKey: parsed.data };
  }
  throw new UnauthorizedException('Invalid API key');
}
```

### 3. ApiKeyGuard

**Location:** `src/auth/api-key.guard.ts`

A simple guard extending NestJS `AuthGuard` with the bearer strategy:

```typescript
@Injectable()
export class ApiKeyGuard extends AuthGuard('bearer') {}
```

**Usage:**

- **Controller Level:** Protects entire controllers
- **Route Level:** Protects individual endpoints
- **Global Level:** Can be applied application-wide

### 4. User Interface

**Location:** `src/auth/user.interface.ts`

Defines the authenticated user context:

```typescript
export interface User {
  /** The validated API key that was used to authenticate the user */
  apiKey: string;
}
```

## Authentication Flow

1. **Request Reception:** Client sends request with `Authorization: Bearer <api-key>` header
2. **Strategy Activation:** `ApiKeyStrategy` is triggered by the `ApiKeyGuard`
3. **Header Validation:** Strategy validates Bearer scheme format
4. **Key Extraction:** API key is extracted from the Authorization header
5. **Service Validation:** `ApiKeyService` validates the key format and authorisation
6. **User Creation:** If valid, a `User` object is created and attached to the request
7. **Route Access:** Request proceeds to the protected route with authenticated context

## Security Features

### 1. Bearer Scheme Validation

The module implements strict Bearer scheme validation:

- **Correct Format:** `Authorization: Bearer <api-key>`
- **Case Sensitivity:** Rejects lowercase `bearer` or other variations
- **Spacing Requirements:** Enforces proper spacing after "Bearer"
- **Security Logging:** Logs malformed schemes for security monitoring

### 2. API Key Format Enforcement

Comprehensive format validation ensures:

- **Minimum Length:** 10 characters minimum to prevent brute force attacks
- **Character Set:** Restricted to alphanumeric, underscore, and hyphen characters
- **Type Safety:** Zod schema validation prevents type confusion attacks
- **Sanitisation:** Automatic rejection of malformed or dangerous input

### 3. Multiple API Key Support

The service supports multiple valid API keys:

- **Centralised Configuration:** All valid keys stored in `API_KEYS` environment variable
- **Comma-Separated List:** `API_KEYS=key1,key2,key3`
- **Independent Validation:** Each key validated independently
- **Logging:** Separate logging for each key validation attempt

### 4. Security Monitoring

Comprehensive logging for security analysis:

- **Authentication Attempts:** All validation attempts logged
- **Invalid Keys:** Warning logs for invalid key attempts
- **Malformed Requests:** Detection and logging of malformed headers
- **Configuration Issues:** Warnings when no API keys are configured

## Configuration

### Environment Variables

- **`API_KEYS`**: Comma-separated list of valid API keys
  - Example: `API_KEYS=prod_key_123,dev_key_456`
  - Required for authentication to work
  - Keys must meet format requirements

### Passport Configuration

The module registers Passport with default bearer strategy:

```typescript
PassportModule.register({ defaultStrategy: 'bearer' });
```

## Usage Examples

### Protecting a Controller

```typescript
@Controller('v1/assessor')
@UseGuards(ApiKeyGuard)
export class AssessorController {
  // All routes in this controller require authentication
}
```

### Protecting Individual Routes

```typescript
@Controller('mixed')
export class MixedController {
  @Get('public')
  public() {
    return 'Public endpoint';
  }

  @Get('protected')
  @UseGuards(ApiKeyGuard)
  protected() {
    return 'Protected endpoint';
  }
}
```

### Accessing User Context

```typescript
@Get('user-info')
@UseGuards(ApiKeyGuard)
getUserInfo(@Request() req: any) {
  const user: User = req.user;
  return { authenticatedKey: user.apiKey };
}
```

## Error Handling

The module provides detailed error responses:

### 401 Unauthorised Responses

- **Missing API Key:** "Unauthorised"
- **Invalid API Key:** `"Invalid API key"`
- **Malformed Bearer:** `"Malformed Bearer scheme."`

### Error Response Format

All authentication errors follow the standard HTTP exception format:

```typescript
{
  "statusCode": 401,
  "message": "Invalid API key",
  "timestamp": "2025-01-08T08:00:00.000Z",
  "path": "/v1/assessor"
}
```

## Testing

The module includes comprehensive test coverage:

### Unit Tests

- **Valid Key Validation:** Tests acceptance of configured valid keys
- **Invalid Key Rejection:** Tests rejection of invalid or malformed keys
- **Format Validation:** Tests API key format requirements
- **Multiple Key Support:** Tests multiple configured keys
- **Edge Cases:** Tests null, undefined, and empty key handling

### E2E Tests

- **Authentication Flow:** End-to-end authentication testing
- **Header Format Validation:** Tests various Authorization header formats
- **Protected Route Access:** Tests route protection enforcement
- **Error Response Format:** Validates consistent error response structure

## Dependencies

The Authentication Module depends on:

- **@nestjs/passport** - Passport.js integration for NestJS
- **passport-http-bearer** - Bearer token strategy implementation
- **ConfigModule** - Environment configuration and API key management
- **zod** - Runtime type validation and schema enforcement

## Related Documentation

- [Config Module](config.md) - Environment variable management
- [API Reference](../api/API_Documentation.md) - Authentication requirements
- [Security Overview](../security/overview.md) - Security architecture
- [API Key Management](../auth/API_Key_Management.md) - API key lifecycle management
