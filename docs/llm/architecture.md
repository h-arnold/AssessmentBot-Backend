# LLM Service Architecture

The LLM (Large Language Model) integration system in AssessmentBot-Backend follows a modular, extensible architecture that supports multiple LLM providers through a common interface. The system is built around dependency injection and abstract base classes to ensure consistent behaviour whilst allowing for provider-specific implementations.

## Overview

The LLM system consists of three main components:

1. **Abstract Base Service** (`LLMService`) - Provides common functionality like retry logic and error handling
2. **Concrete Implementations** (e.g., `GeminiService`) - Provider-specific API integrations  
3. **Module Configuration** (`LlmModule`) - Dependency injection and service registration

## Abstract Service Pattern

### LLMService Base Class

The `LLMService` abstract class (`src/llm/llm.service.interface.ts`) provides:

- **Automatic retry logic** with exponential backoff for rate limiting (HTTP 429)
- **Resource exhaustion detection** for quota-exceeded scenarios
- **Configurable retry parameters** via environment variables
- **Standard error handling** across all LLM providers

```typescript
@Injectable()
export abstract class LLMService {
  async send(payload: LlmPayload): Promise<LlmResponse>
  protected abstract _sendInternal(payload: LlmPayload): Promise<LlmResponse>
}
```

### Key Features

- **Rate Limit Handling**: Automatically retries on HTTP 429 with exponential backoff
- **Quota Management**: Distinguishes between retryable rate limits and permanent quota exhaustion
- **Error Normalisation**: Provides consistent error handling across different LLM SDKs
- **Configuration-Driven**: Retry attempts and backoff timing controlled via environment variables

## Payload Types

The system supports two payload types:

### StringPromptPayload
```typescript
{
  system: string;    // System instruction/context
  user: string;      // User prompt
  temperature?: number; // Optional sampling temperature
}
```

### ImagePromptPayload  
```typescript
{
  system: string;    // System instruction/context
  images: Array<{    // Array of images (base64 or URI)
    mimeType: string;
    data?: string;   // Base64 data
    uri?: string;    // Uploaded file URI
  }>;
  messages?: Array<{ content: string }>; // Optional text content
  temperature?: number; // Optional sampling temperature
}
```

## Response Format

All LLM providers must return responses conforming to the `LlmResponse` schema:

```typescript
{
  completeness: { score: number, reasoning: string },
  accuracy: { score: number, reasoning: string },
  spag: { score: number, reasoning: string }
}
```

- **Scores**: Integer values 0-5
- **Reasoning**: Non-empty explanatory text for each score

## Module Configuration

### Dependency Injection

The `LlmModule` (`src/llm/llm.module.ts`) configures dependency injection:

```typescript
@Module({
  providers: [
    GeminiService,
    {
      provide: LLMService,
      useClass: GeminiService,  // Current default implementation
    },
  ],
  exports: [LLMService],
})
export class LlmModule {}
```

### Service Selection

Currently, the system uses `GeminiService` as the default implementation. To change providers:

1. Create a new service extending `LLMService`
2. Update the module's `useClass` property
3. Add any provider-specific configuration

## Configuration

### Environment Variables

LLM behaviour is controlled via these environment variables:

- `LLM_MAX_RETRIES` (default: 3) - Maximum retry attempts for rate limits
- `LLM_BACKOFF_BASE_MS` (default: 1000) - Base backoff time in milliseconds
- `GEMINI_API_KEY` - API key for Google Gemini service

### Retry Logic Configuration

The system implements exponential backoff with jitter:

```
delay = baseBackoffMs × 2^attempt + random(0-100)ms
```

This prevents thundering herd problems when multiple requests are rate-limited simultaneously.

## Error Handling Architecture

The system provides sophisticated error handling:

### Error Types

1. **Rate Limit Errors** (HTTP 429) - Automatically retried with backoff
2. **Resource Exhausted Errors** - Quota exceeded, not retried
3. **Validation Errors** - Invalid response format (Zod validation)
4. **Network/API Errors** - Connection failures, authentication issues

### Error Flow

1. Provider-specific implementation calls LLM API
2. Base class catches and classifies errors
3. Rate limits trigger retry with exponential backoff  
4. Resource exhausted errors bubble up immediately
5. Other errors are wrapped with context information

## Logging

The system provides comprehensive logging at debug level:

- Request payloads (sanitised for image content)
- Raw LLM responses
- Parsed JSON responses
- Retry attempts and delays
- Error details and classifications

This enables effective debugging while respecting data privacy for image uploads.
