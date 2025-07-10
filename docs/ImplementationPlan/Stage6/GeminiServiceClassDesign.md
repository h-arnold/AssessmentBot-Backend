# GeminiService Class Design (SDK-Based)

This document outlines the design for the `GeminiService`, which implements the `LLMService` interface using the official `@google/genai` SDK. This approach is preferred over manual HTTP requests for its robustness, maintainability, and type safety.

## 1. Objectives

- Implement the `send` method to forward prompts to the Gemini API using the `@google/genai` SDK.
- Handle both text-only and multimodal (text and image) payloads.
- **Validate the LLM's response** against the `LlmResponseSchema` to ensure data integrity.
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

The `HttpService` is replaced with the `GoogleGenerativeAI` client from the SDK. The `send` method now validates the response.

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerateContentRequest,
  Part,
} from '@google/genai';
import { LLMService } from './llm.service.interface';
import { LlmResponse, LlmResponseSchema } from './types';
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
  ): Promise<LlmResponse> {
    const modelName = this.isMultimodal(payload)
      ? 'gemini-pro-vision'
      : 'gemini-pro';
    const model = this.client.getGenerativeModel({ model: modelName });

    const request = this.buildRequest(payload);

    try {
      const result = await model.generateContent(request);
      const responseText = result.response.text();
      const repairedJson = jsonrepair(responseText);
      const parsedJson = JSON.parse(repairedJson);

      // Validate the parsed JSON against the Zod schema
      return LlmResponseSchema.parse(parsedJson);
    } catch (error) {
      this.logger.error(
        'Error communicating with or validating response from Gemini API',
        error,
      );
      // Handle ZodErrors specifically if needed, otherwise re-throw
      throw new Error(
        'Failed to get a valid and structured response from the LLM.',
      );
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

    const { messages, images } = payload;
    const textPart = { text: messages[0].content };

    const imageParts: Part[] = images.map(
      (img: { mimeType: string; data: string }) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
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

The testing strategy remains the same, but with additional test cases for response validation.

## 8. Detailed Test Cases

### 8.1. Mocking Setup (`gemini.service.spec.ts`)

(No changes to the mocking setup)

### 8.2. Test Cases

| Test Case                                                                    | Inputs & Mocks                                                                                                                                                                                                                                                        | Expected Outcome                                                                                                                                |
| :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Should initialise the SDK correctly**                                      | Service is instantiated.                                                                                                                                                                                                                                              | - `ConfigService.get` is called with `'GEMINI_API_KEY'`.<br>- The `GoogleGenerativeAI` constructor is called with the retrieved API key.        |
| **Should send a text payload and return a valid, structured response**       | `payload`: A simple string.<br>`mockGenerateContent.mockResolvedValue({ response: { text: () => '{"completeness": {"score": 5, "reasoning": "Perfect"}, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}' } })`              | - `getGenerativeModel` is called with `{ model: 'gemini-pro' }`.<br>- The service returns the parsed and validated `LlmResponse` object.        |
| **Should send a multimodal payload and return a valid, structured response** | `payload`: An object from `ImagePrompt`.<br>`mockGenerateContent.mockResolvedValue({ response: { text: () => '{"completeness": {"score": 5, "reasoning": "Perfect"}, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}' } })` | - `getGenerativeModel` is called with `{ model: 'gemini-pro-vision' }`.<br>- The service returns the parsed and validated `LlmResponse` object. |
| **Should handle malformed JSON and still return a valid response**           | `payload`: A simple string.<br>`mockGenerateContent.mockResolvedValue({ response: { text: () => '{"completeness": {"score": 5, "reasoning": "Perfect"},, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}' } })`             | - The service calls `jsonrepair`.<br>- The service returns the parsed and validated `LlmResponse` object.                                       |
| **Should throw an error if the SDK fails**                                   | `payload`: A simple string.<br>`mockGenerateContent.mockRejectedValue(new Error('SDK Error'))`                                                                                                                                                                        | - The service logs the error.<br>- The service throws a new `Error` with a user-friendly message.                                               |
| **Should throw a ZodError for an invalid response structure**                | `payload`: A simple string.<br>`mockGenerateContent.mockResolvedValue({ response: { text: () => '{"completeness": {"score": 99, "reasoning": "Invalid Score"}}' } })`                                                                                                 | - The service logs the error.<br>- The service throws an error (specifically a `ZodError` which can be caught).                                 |
| **Should throw an error for missing criteria**                               | `payload`: A simple string.<br>`mockGenerateContent.mockResolvedValue({ response: { text: () => '{"completeness": {"score": 5, "reasoning": "Perfect"}}' } })`                                                                                                        | - The service logs the error.<br>- The service throws a `ZodError`.                                                                             |
