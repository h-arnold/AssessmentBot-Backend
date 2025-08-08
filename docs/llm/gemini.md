# Gemini Integration

This document details the Google Gemini implementation (`GeminiService`) which serves as the default LLM provider for AssessmentBot-Backend. The implementation supports both text-only and multimodal (image + text) assessment scenarios.

## Overview

The `GeminiService` (`src/llm/gemini.service.ts`) provides integration with Google's Generative AI service, implementing the abstract `LLMService` interface whilst handling Gemini-specific API requirements and response formats.

### Key Features

- **Multimodal Support**: Handles both text-only and image-based assessments
- **Dynamic Model Selection**: Automatically chooses appropriate Gemini models based on content type
- **JSON Response Parsing**: Robust parsing with automatic repair of malformed JSON
- **Temperature Control**: Configurable response creativity/randomness
- **Comprehensive Logging**: Detailed request/response logging for debugging

## Configuration

### Environment Variables

```bash
GEMINI_API_KEY=your_google_api_key_here
```

The API key is required and must be set in your environment. The service will throw an error during initialisation if the key is missing.

### Model Selection

The service automatically selects models based on payload type:

- **Text-only prompts**: `gemini-2.0-flash-lite` - Optimised for fast text generation
- **Image prompts**: `gemini-2.5-flash` - Supports multimodal input processing

## Supported Input Types

### Text-Only Assessment

```typescript
const textPayload: StringPromptPayload = {
  system: "You are an expert assessor...",
  user: "Please assess this student response: ...",
  temperature: 0.2 // Optional, defaults to 0
};
```

### Image-Based Assessment

```typescript
const imagePayload: ImagePromptPayload = {
  system: "You are an expert assessor...",
  images: [
    {
      mimeType: "image/png",
      data: "base64_encoded_image_data" // For inline images
    },
    {
      mimeType: "image/jpeg", 
      uri: "uploaded_file_uri" // For uploaded files
    }
  ],
  messages: [
    { content: "Please assess this visual response..." }
  ],
  temperature: 0 // Optional
};
```

### Image Format Support

The service supports both image input methods:

1. **Inline Base64**: Images encoded as base64 strings
2. **File URIs**: References to uploaded files in Google's file storage

Supported MIME types are determined by the application's `ALLOWED_IMAGE_MIME_TYPES` configuration.

## API Integration Details

### Request Building

The service constructs Gemini API requests using:

```typescript
const modelParams: ModelParams = {
  model: modelName,           // Selected based on content type
  systemInstruction: payload.system,
  generationConfig: { temperature }
};

const contents = this.buildContents(payload); // Text + images
```

### Response Processing

1. **Raw Response**: Extracts text from Gemini's response object
2. **JSON Parsing**: Uses `JsonParserUtil` to repair and parse malformed JSON
3. **Array Handling**: Handles cases where Gemini returns single-item arrays
4. **Schema Validation**: Validates against `LlmResponseSchema` using Zod

```typescript
const responseText = result.response.text?.() ?? '';
const parsedJson = this.jsonParserUtil.parse(responseText);
const dataToValidate = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
return LlmResponseSchema.parse(dataToValidate);
```

## Error Handling

### Gemini-Specific Errors

The service handles various Gemini API error scenarios:

1. **Rate Limiting**: HTTP 429 errors with automatic retry via base class
2. **Quota Exhaustion**: Resource exhausted errors that shouldn't be retried
3. **Invalid Responses**: Malformed JSON or schema validation failures
4. **Authentication**: Invalid API key errors

### Error Flow

```typescript
try {
  // Generate content via Gemini API
  const result = await model.generateContent(contents);
  // Process and validate response
} catch (error) {
  this.geminiLogger.debug('Error communicating with Gemini API', error);
  
  if (error instanceof ZodError) {
    this.logger.error('Zod validation failed', error.issues);
    throw error; // Validation errors bubble up immediately
  }
  
  throw error; // Let base class handle retries and wrapping
}
```

## Logging and Debugging

### Debug Logging

The service provides comprehensive debug logging:

```typescript
// Request logging
this.geminiLogger.debug(
  `Sending to Gemini with model: ${modelParams.model}, temperature: ${temperature}`
);

// Payload logging (sanitised for images)
this.logPayload(payload, contents);

// Response logging
this.geminiLogger.debug(`Raw response from Gemini: \n\n${responseText}`);
this.geminiLogger.debug(`Parsed JSON response: ${JSON.stringify(parsedJson, null, 2)}`);
```

### Payload Sanitisation

For image payloads, the service logs only metadata to avoid logging large binary data:

```typescript
private logPayload(payload: LlmPayload, contents: (string | Part)[]): void {
  if (this.isStringPromptPayload(payload)) {
    // Log full contents for text payloads
    this.geminiLogger.debug(`String payload being sent: ${JSON.stringify(contents, null, 2)}`);
  } else if (this.isImagePromptPayload(payload)) {
    // Log only count for image payloads
    this.geminiLogger.debug(`Image payload being sent with ${contents.length} content items`);
  }
}
```

## Performance Characteristics

### Model Performance

- **gemini-2.0-flash-lite**: Optimised for speed with text-only inputs
- **gemini-2.5-flash**: Balanced performance for multimodal processing

### Response Times

Typical response times (approximate):
- Text-only assessments: 1-3 seconds
- Image-based assessments: 3-8 seconds

Response times depend on:
- Prompt complexity
- Image size and number
- Current API load
- Temperature settings (higher values may take longer)

### Rate Limiting

Gemini API rate limits vary by:
- API tier (free vs paid)
- Request type (text vs multimodal)
- Geographic region

The base class handles rate limiting automatically with exponential backoff.

## Temperature Effects

Temperature controls response creativity/determinism:

- **0.0**: Highly deterministic, consistent responses
- **0.2**: Slight variation whilst maintaining consistency
- **0.5**: Balanced creativity and consistency
- **1.0**: High creativity, more varied responses

For assessment scenarios, lower temperatures (0-0.3) are recommended for consistency.

## Common Integration Patterns

### Basic Text Assessment

```typescript
@Injectable()
export class AssessmentService {
  constructor(private readonly llmService: LLMService) {}

  async assessTextResponse(studentResponse: string): Promise<LlmResponse> {
    const payload: StringPromptPayload = {
      system: "Assess this student response for completeness, accuracy, and SPAG...",
      user: `Student response: ${studentResponse}`,
      temperature: 0.1
    };

    return await this.llmService.send(payload);
  }
}
```

### Image Assessment with Context

```typescript
async assessImageResponse(
  images: ImageData[],
  context: string
): Promise<LlmResponse> {
  const payload: ImagePromptPayload = {
    system: "Assess this visual student response...",
    images: images.map(img => ({
      mimeType: img.mimeType,
      data: img.base64Data
    })),
    messages: [{ content: context }],
    temperature: 0
  };

  return await this.llmService.send(payload);
}
```

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `GEMINI_API_KEY` is set in environment
2. **Quota Exceeded**: Monitor usage in Google AI Studio console  
3. **Invalid Responses**: Check debug logs for malformed JSON
4. **Rate Limiting**: Increase `LLM_MAX_RETRIES` if needed

### Debug Steps

1. Enable debug logging: Set `LOG_LEVEL=debug`
2. Check raw responses in logs
3. Verify API key permissions
4. Monitor Google AI Studio quotas
5. Review request payloads for issues

### Response Quality Issues

If assessments seem inconsistent:

1. Lower temperature (closer to 0)
2. Improve system prompts
3. Add more specific examples
4. Review prompt engineering best practices

## Limitations

### Current Limitations

1. **Model Selection**: Currently hardcoded per content type
2. **Single Provider**: No failover to alternative providers
3. **JSON Dependency**: Responses must be valid JSON after repair
4. **Fixed Schema**: All responses must match the three-criteria assessment format

### Future Considerations

- Support for additional Gemini models
- Configurable model selection strategies
- Alternative response formats
- Streaming response support
- Fine-tuned model integration