# LLMService Class Design

This design document describes the `LLMService` interface, its data structures, and its expected usage within the LLM module.

## 1. Objectives

- Define an abstract interface for interacting with any LLM provider.
- Standardise and validate the structure of the response from the LLM.
- Support dependency injection in NestJS.
- Facilitate mocking for unit and integration tests.

## 2. Directory Structure

```
src/
  llm/
    llm.service.interface.ts
    llm.module.ts
    gemini.service.ts
    types.ts
```

## 3. Response Data Structures (`types.ts`)

To ensure robustness, the output of the `LLMService` will be strictly validated. This is defined in `src/llm/types.ts`.

```ts
import { z } from 'zod';

/**
 * Defines the schema for a single assessment criterion.
 * - `score`: An integer between 0 and 5.
 * - `reasoning`: A non-empty string explaining the score.
 */
export const AssessmentCriterionSchema = z.object({
  score: z.number().int().min(0).max(5),
  reasoning: z.string().min(1),
});

/**
 * Defines the schema for the complete LLM assessment response.
 * It expects exactly three criteria: completeness, accuracy, and spag.
 */
export const LlmResponseSchema = z.object({
  completeness: AssessmentCriterionSchema,
  accuracy: AssessmentCriterionSchema,
  spag: AssessmentCriterionSchema,
});

/**
 * TypeScript type inferred from the LlmResponseSchema.
 */
export type LlmResponse = z.infer<typeof LlmResponseSchema>;
```

## 4. LLMService Interface (`llm.service.interface.ts`)

The interface now returns a strictly typed and validated `LlmResponse`.

### Interface

```ts
import { LlmResponse } from './types';

export interface LLMService {
  /**
   * Send a payload to the LLM provider.
   * @param payload - Can be a rendered prompt string or an object with messages and attachments.
   * @returns A Promise resolving to a validated LLM response payload.
   */
  send(payload: string | Record<string, any>): Promise<LlmResponse>;
}
```

## 5. LlmModule (`llm.module.ts`)

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMService } from './llm.service.interface';
import { GeminiService } from './gemini.service';

@Module({
  providers: [
    {
      provide: LLMService,
      useClass: GeminiService,
    },
    GeminiService,
  ],
  exports: [LLMService],
})
export class LlmModule {}
```

## 5. Testing Strategy: Mocking the `LLMService`

As `LLMService` is an interface, it has no implementation to test directly. Instead, the testing strategy focuses on how to test _consumers_ of this interface (e.g., `AssessorService`) by providing a mock implementation. This ensures that consumer services can be tested in isolation, without making real network calls.

### 5.1. Creating a Mock `LLMService`

A mock service is created for use in NestJS testing modules. This mock can be a simple object or a class that implements the `LLMService` interface.

```ts
// In a test file, e.g., assessor.service.spec.ts

const mockLlmService = {
  send: jest.fn(), // Create a Jest mock function for the send method
};
```

### 5.2. Injecting the Mock

The mock is injected into the `TestingModule` using `overrideProvider`. This tells NestJS to use our mock implementation whenever `LLMService` is requested via dependency injection.

```ts
// In a test file, e.g., assessor.service.spec.ts

const module: TestingModule = await Test.createTestingModule({
  providers: [
    AssessorService, // The service we are testing
    {
      provide: LLMService, // The token to override
      useValue: mockLlmService, // Our mock implementation
    },
    // ... other providers like PromptFactory
  ],
}).compile();

service = module.get<AssessorService>(AssessorService);
```

### 5.3. Test Cases for a Consumer (`AssessorService`)

These test cases validate that the `AssessorService` correctly interacts with the `LLMService` interface.

| Test Case | Setup & Mocks - **Should call `llmService.send` with the correct payload** | - `PromptFactory` is mocked to return a prompt object with a known `buildMessage()` result (e.g., a simple string `'test_payload'`).<br>- `mockLlmService.send.mockResolvedValue({ score: 5 })` - **Expected Outcome** - `llmService.send` is called exactly once. - `llmService.send` is called with the exact payload (`'test_payload'`). - The consumer service (e.g., `AssessorService`) returns the mocked response (`{ score: 5 }`). - |
| **Should handle errors thrown by `llmService.send`** | - `PromptFactory` is mocked as above.<br>- `mockLlmService.send.mockRejectedValue(new Error('API Error'))` - The consumer service should catch the error. - It should log the error and potentially throw a new, more user-friendly exception (depending on the consumer's error handling strategy). - |
