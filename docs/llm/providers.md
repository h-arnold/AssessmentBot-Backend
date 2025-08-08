# Adding New LLM Providers

This guide explains how to integrate new LLM providers into the AssessmentBot-Backend system. The modular architecture allows you to add support for any LLM service whilst maintaining consistent error handling and retry behaviour.

## Implementation Requirements

### 1. Extend the LLMService Base Class

All LLM providers must extend the abstract `LLMService` class and implement the `_sendInternal` method:

```typescript
import { Injectable } from '@nestjs/common';
import { LLMService, LlmPayload } from './llm.service.interface';
import { LlmResponse } from './types';
import { ConfigService } from '../config/config.service';

@Injectable()
export class YourProviderService extends LLMService {
  constructor(configService: ConfigService) {
    super(configService);
    // Provider-specific initialisation
  }

  protected async _sendInternal(payload: LlmPayload): Promise<LlmResponse> {
    // Your implementation here
  }
}
```

### 2. Handle Both Payload Types

Your implementation must support both `StringPromptPayload` and `ImagePromptPayload`:

```typescript
protected async _sendInternal(payload: LlmPayload): Promise<LlmResponse> {
  if ('user' in payload) {
    // Handle StringPromptPayload
    return this.handleTextPrompt(payload);
  } else if ('images' in payload) {
    // Handle ImagePromptPayload  
    return this.handleImagePrompt(payload);
  }
  throw new Error('Unsupported payload type');
}
```

### 3. Return Validated Responses

All responses must conform to the `LlmResponse` schema with three assessment criteria:

```typescript
import { LlmResponseSchema } from './types';

// Parse and validate your provider's response
const parsedResponse = await this.parseProviderResponse(rawResponse);
return LlmResponseSchema.parse(parsedResponse);
```

## Configuration Setup

### 1. Add Environment Variables

Add your provider's configuration to `src/config/env.schema.ts`:

```typescript
export const configSchema = z.object({
  // Existing variables...
  YOUR_PROVIDER_API_KEY: z.string().min(1),
  YOUR_PROVIDER_MODEL: z.string().default('default-model'),
  // Add other provider-specific settings
});
```

### 2. Access Configuration

Use the injected `ConfigService` to access your configuration:

```typescript
constructor(configService: ConfigService) {
  super(configService);
  const apiKey = this.configService.get('YOUR_PROVIDER_API_KEY');
  const model = this.configService.get('YOUR_PROVIDER_MODEL');
  // Initialise your provider's client
}
```

## Module Registration

### 1. Update LlmModule

Register your service in `src/llm/llm.module.ts`:

```typescript
@Module({
  imports: [ConfigModule, CommonModule],
  providers: [
    GeminiService,
    YourProviderService, // Add your service
    {
      provide: LLMService,
      useClass: YourProviderService, // Change default provider
    },
  ],
  exports: [LLMService],
})
export class LlmModule {}
```

### 2. Provider Selection Strategy

For dynamic provider selection, implement a factory:

```typescript
{
  provide: LLMService,
  useFactory: (configService: ConfigService) => {
    const provider = configService.get('LLM_PROVIDER');
    switch (provider) {
      case 'gemini':
        return new GeminiService(configService, jsonParserUtil);
      case 'your-provider':
        return new YourProviderService(configService);
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  },
  inject: [ConfigService],
}
```

## Implementation Guidelines

### Error Handling

Your `_sendInternal` method should throw appropriate errors:

```typescript
try {
  const response = await yourProviderAPI.generate(prompt);
  return this.parseResponse(response);
} catch (error) {
  // Don't handle retries - the base class handles that
  // Just throw the original error with appropriate status codes
  throw error;
}
```

The base class will automatically:
- Retry on HTTP 429 (rate limit) errors
- Handle resource exhausted scenarios
- Apply exponential backoff
- Wrap unknown errors with context

### Response Parsing

Most LLM providers return unstructured text that needs parsing:

```typescript
private parseResponse(rawResponse: string): LlmResponse {
  // Use the JSON parser utility for robust parsing
  const parsed = this.jsonParserUtil.parse(rawResponse);
  
  // Handle arrays (some LLMs return single-item arrays)
  const data = Array.isArray(parsed) ? parsed[0] : parsed;
  
  // Validate against schema
  return LlmResponseSchema.parse(data);
}
```

### Temperature Support

Handle the optional `temperature` parameter:

```typescript
const temperature = payload.temperature ?? 0; // Default to 0
// Apply temperature to your provider's generation parameters
```

### Logging

Use the provided logger for debugging:

```typescript
export class YourProviderService extends LLMService {
  private readonly providerLogger = new Logger(YourProviderService.name);

  protected async _sendInternal(payload: LlmPayload): Promise<LlmResponse> {
    this.providerLogger.debug('Sending request to Your Provider');
    // Implementation...
  }
}
```

## Testing Requirements

### 1. Unit Tests

Create comprehensive unit tests following the existing pattern:

```typescript
// your-provider.service.spec.ts
describe('YourProviderService', () => {
  let service: YourProviderService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        YourProviderService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JsonParserUtil, useValue: mockJsonParserUtil },
      ],
    }).compile();

    service = module.get<YourProviderService>(YourProviderService);
  });

  // Test both payload types, error scenarios, etc.
});
```

### 2. Integration Tests

Test your provider with real API calls (when API keys are available):

```typescript
// Integration test example following existing patterns
describe('YourProvider Integration', () => {
  it('should handle resource exhausted errors correctly', () => {
    // Test quota exhaustion scenario
  });
});
```

## Example Implementation Structure

Here's a minimal implementation template:

```typescript
@Injectable()
export class YourProviderService extends LLMService {
  private readonly client: YourProviderClient;
  private readonly providerLogger = new Logger(YourProviderService.name);

  constructor(
    configService: ConfigService,
    private readonly jsonParserUtil: JsonParserUtil,
  ) {
    super(configService);
    const apiKey = this.configService.get('YOUR_PROVIDER_API_KEY');
    this.client = new YourProviderClient({ apiKey });
  }

  protected async _sendInternal(payload: LlmPayload): Promise<LlmResponse> {
    const prompt = this.buildPrompt(payload);
    const temperature = payload.temperature ?? 0;

    this.providerLogger.debug(`Sending request with temperature: ${temperature}`);

    try {
      const response = await this.client.generate({
        prompt,
        temperature,
        // Other provider-specific parameters
      });

      const responseText = response.text || '';
      this.providerLogger.debug(`Raw response: ${responseText}`);

      const parsed = this.jsonParserUtil.parse(responseText);
      const data = Array.isArray(parsed) ? parsed[0] : parsed;

      return LlmResponseSchema.parse(data);
    } catch (error) {
      this.providerLogger.debug('Provider API error', error);
      throw error; // Let base class handle retries and error wrapping
    }
  }

  private buildPrompt(payload: LlmPayload): string {
    // Convert payload to provider-specific prompt format
    // Handle both text and image payloads appropriately
  }
}
```

## Best Practices

1. **Follow existing patterns** - Study `GeminiService` for implementation guidance
2. **Handle all payload types** - Support both text and image prompts
3. **Use the JSON parser utility** - For robust response parsing
4. **Log appropriately** - Debug level for requests/responses, warn/error for issues
5. **Don't implement retry logic** - The base class handles this automatically
6. **Validate responses strictly** - Use the Zod schema for type safety
7. **Test thoroughly** - Cover both success and error scenarios
8. **Document provider-specific quirks** - Any unique behaviour or limitations