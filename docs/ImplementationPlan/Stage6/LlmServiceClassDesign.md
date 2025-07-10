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

## 5. Testing

- Use a `MockLlmService` implementing `LLMService` for unit tests.
- Inject the mock via `overrideProvider` in `TestingModule`.
- Ensure deterministic responses for given inputs.
