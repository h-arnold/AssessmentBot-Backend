# LLMService Class Design

This design document describes the `LLMService` interface and its expected usage within the LLM module.

## 1. Objectives

- Define an abstract interface for interacting with any LLM provider.
- Standardise the request and response payloads.
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

## 3. LLMService Interface (`llm.service.interface.ts`)

### Responsibilities

- Declare methods for sending prompts and receiving responses.
- Accept generic payloads representing either string messages or structured requests.
- Return a Promise resolving to a structured response.

### Interface

```ts
export interface LLMService {
  /**
   * Send a payload to the LLM provider.
   * @param payload - Can be a rendered prompt string or an object with messages and attachments.
   * @returns A Promise resolving to the LLM response payload.
   */
  send(payload: string | Record<string, any>): Promise<Record<string, any>>;
}
```

## 4. LlmModule (`llm.module.ts`)

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
