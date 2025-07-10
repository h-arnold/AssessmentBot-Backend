# GeminiService Class Design (SDK-Based)

This document outlines the design for the `GeminiService`, which implements the `LLMService` interface using the official `@google/genai` SDK. This approach is preferred over manual HTTP requests for its robustness, maintainability, and type safety.

## 1. Objectives

- Implement the `send` method to forward prompts to the Gemini API using the `@google/genai` SDK.
- Handle both text-only and multimodal (text and image) payloads.
- Leverage the SDK's built-in types for requests and responses.
- Integrate with NestJS `ConfigService` for secure API key management.
- Ensure the service remains easily mockable for testing.

## 2. Dependency

This design requires the official Google GenAI SDK.

```bash
npm install @google/genai
```

## 3. Directory Structure

The directory structure remains the same, but the `HttpModule` is no longer a dependency for this service.

```
src/
  llm/
    llm.service.interface.ts
    gemini.service.ts
    llm.module.ts
    types.ts
```

## 4. Environment Configuration

The service will retrieve the Gemini API key from the `ConfigService`. The Zod schema for validation should be defined centrally in the `ConfigModule`.

```ts
// In the central Zod schema for environment variables
const EnvironmentSchema = z.object({
  // ... other variables
  GEMINI_API_KEY: z.string().min(1),
});
```

## 5. `gemini.service.ts` (SDK Implementation)

The `HttpService` is replaced with the `GoogleGenerativeAI` client from the SDK.

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerateContentRequest,
  Part,
} from '@google/genai';
import { LLMService } from './llm.service.interface';
import { jsonrepair } from 'jsonrepair';

@Injectable()
export class GeminiService implements LLMService {
  private readonly client: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.client = new GoogleGenerativeAI(apiKey);
  }

  public async send(
    payload: string | Record<string, any>,
  ): Promise<Record<string, any>> {
    // Select the appropriate model based on the payload
    const modelName = this.isMultimodal(payload)
      ? 'gemini-pro-vision'
      : 'gemini-pro';
    const model = this.client.getGenerativeModel({ model: modelName });

    const request = this.buildRequest(payload);

    try {
      const result = await model.generateContent(request);
      const responseText = result.response.text();

      // Use jsonrepair for robust parsing of the LLM's text response
      const repairedJson = jsonrepair(responseText);
      return JSON.parse(repairedJson);
    } catch (error) {
      this.logger.error('Error communicating with Gemini API', error);
      // Re-throw or handle as per application's error handling strategy
      throw new Error('Failed to get a valid response from the LLM.');
    }
  }

  private isMultimodal(payload: string | Record<string, any>): boolean {
    return typeof payload === 'object' && payload.hasOwnProperty('images');
  }

  private buildRequest(
    payload: string | Record<string, any>,
  ): GenerateContentRequest {
    if (typeof payload === 'string') {
      return { contents: [{ role: 'user', parts: [{ text: payload }] }] };
    }

    // Handle structured multimodal payload from ImagePrompt
    const { messages, images } = payload;
    const textPart = { text: messages[0].content }; // Assuming single text message

    const imageParts: Part[] = images.map(
      (img: { mimeType: string; data: string }) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data, // Assuming data is base64 string
        },
      }),
    );

    return { contents: [{ role: 'user', parts: [textPart, ...imageParts] }] };
  }
}
```

## 6. `LlmModule` (`llm.module.ts`)

The `HttpModule` is no longer needed.

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLMService } from './llm.service.interface';
import { GeminiService } from './gemini.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLMService,
      useClass: GeminiService,
    },
  ],
  exports: [LLMService],
})
export class LlmModule {}
```

## 7. Testing Strategy

- Unit tests for `GeminiService` will mock the `@google/genai` client.
- Use `jest.spyOn` to spy on the `generateContent` method of the `GenerativeModel`.
- This allows simulating successful responses, error cases, and different response formats without making actual API calls.

```ts
// Example test setup
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest
      .fn()
      .mockReturnValue({ generateContent: mockGenerateContent }),
  })),
}));

// In a test case
mockGenerateContent.mockResolvedValue({
  response: { text: () => '{"key": "value"}' },
});
```

This updated design is more robust, easier to maintain, and leverages the full power of the official SDK, aligning perfectly with the project's principles.

## 8. Detailed Test Cases

### 8.1. Mocking Setup (`gemini.service.spec.ts`)

```ts
// Mock the entire @google/genai library
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest
  .fn()
  .mockReturnValue({ generateContent: mockGenerateContent });

jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// Mock ConfigService
const mockConfigService = {
  get: jest.fn().mockReturnValue('test-api-key'),
};

// Before each test, clear mock history
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 8.2. Test Cases

| Test Case | Inputs & Mocks - **Should initialise the SDK correctly** | Service is instantiated. - **Expected Outcome** - `ConfigService.get` is called with `'GEMINI_API_KEY'`. - The `GoogleGenerativeAI` constructor is called with the retrieved API key. - |
| **Should send a simple text payload** | `payload`: A simple string like `'Hello, world'`.<br>`mockGenerateContent.mockResolvedValue({ response: { text: () => '{"message": "success"}' } })` - `getGenerativeModel` is called with `{ model: 'gemini-pro' }`. - `generateContent` is called with `{ contents: [{ role: 'user', parts: [{ text: 'Hello, world' }] }] }`. - The service returns the parsed JSON object `{ message: 'success' }`. - |
| **Should send a multimodal (image) payload** | `payload`: An object from `ImagePrompt` with `messages` and `images` properties.<br>`mockGenerate-Content.mockResolvedValue({ response: { text: () => '{"message": "image received"}' } })` - `getGenerativeModel` is called with `{ model: 'gemini-pro-vision' }`. - `generateContent` is called with a `parts` array containing both text and image data, correctly formatted. - The service returns the parsed JSON object `{ message: 'image received' }`. - |
| **Should handle malformed JSON response from LLM** | `payload`: A simple string.<br>`mockGenerateContent.mockResolvedValue({ response: { text: () => '{"message": "bad json",}' } })` (Note the trailing comma) - The service should call `jsonrepair` and successfully parse the corrected JSON. - The service returns `{ message: 'bad json' }`. - |
| **Should throw an error if the SDK fails** | `payload`: A simple string.<br>`mockGenerateContent.mockRejectedValue(new Error('SDK Error'))` - The service should log the error. - The service should throw a new `Error` with a user-friendly message like "Failed to get a valid response from the LLM." - |
| **Should correctly build a request for a text payload** | `payload`: A simple string. - The private `buildRequest` method should return a `GenerateContentRequest` object with the correct structure for a text-only prompt. - |
| **Should correctly build a request for a multimodal payload** | `payload`: A structured object with `messages` and `images` (base64 data). - The private `buildRequest` method should return a `GenerateContentRequest` object where the `parts` array contains both the text and the correctly formatted `inlineData` for the images. |

This updated design is more robust, easier to maintain, and leverages the full power of the official SDK, aligning perfectly with the project's principles.
