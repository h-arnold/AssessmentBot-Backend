# GeminiService Class Design

This document outlines the design for the `GeminiService`, which implements the `LLMService` interface to communicate with the Gemini LLM provider.

## 1. Objectives

- Implement the `send` method to forward prompt payloads to the Gemini API.
- Handle both text and structured payloads (messages with attachments).
- Parse and normalise provider responses into a `Record<string, any>`.
- Leverage NestJS `HttpService` and `ConfigService`.
- Support runtime validation with Zod for environment variables and response shapes.
- Facilitate mocking in tests.

## 2. Directory Structure

```
src/
  llm/
    llm.service.interface.ts
    gemini.service.ts
    llm.module.ts
    types.ts            # Shared types for messages and attachments
```

## 3. Environment Configuration

Use Zod to validate environment variables in `config.service.ts` or a dedicated Zod schema:

```ts
const GeminiConfigSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_API_URL: z.string().url(),
});
```

Inject via `ConfigService`:

```ts
const { GEMINI_API_KEY, GEMINI_API_URL } =
  this.configService.get<unknown>(/* ... */);
GeminiConfigSchema.parse({ GEMINI_API_KEY, GEMINI_API_URL });
```

## 4. Shared Types (`types.ts`)

```ts
export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64-encoded or URL
}

export interface LlmResponse {
  messages: Array<{ content: string; role: string }>;
  attachments?: Attachment[];
  // Additional metadata if needed
}
```

## 5. `gemini.service.ts`

```ts
import { Injectable, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMService } from './llm.service.interface';
import { Attachment, LlmResponse } from './types';
import { z } from 'zod';

const GeminiResponseSchema = z.object({
  messages: z.array(z.object({ content: z.string(), role: z.string() })),
  attachments: z.optional(
    z.array(
      z.object({ name: z.string(), mimeType: z.string(), data: z.string() }),
    ),
  ),
});

@Injectable()
export class GeminiService implements LLMService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const raw = {
      GEMINI_API_KEY: this.configService.get<string>('GEMINI_API_KEY'),
      GEMINI_API_URL: this.configService.get<string>('GEMINI_API_URL'),
    };
    const config = z
      .object({
        GEMINI_API_KEY: z.string().min(1),
        GEMINI_API_URL: z.string().url(),
      })
      .parse(raw);

    this.apiKey = config.GEMINI_API_KEY;
    this.apiUrl = config.GEMINI_API_URL;
  }

  public async send(
    payload: string | Record<string, any>,
  ): Promise<Record<string, any>> {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const body =
      typeof payload === 'string'
        ? { messages: [{ role: 'user', content: payload }] }
        : payload;

    const response = await this.httpService
      .post<LlmResponse>(this.apiUrl, body, { headers })
      .toPromise();

    const parsed = GeminiResponseSchema.parse(response.data);
    return parsed;
  }
}
```

## 6. Testing Strategy

- In unit tests, provide a `MockLlmService` replacing `GeminiService`:
  ```ts
  class MockLlmService implements LLMService {
    send(payload: any) {
      return Promise.resolve({
        messages: [{ role: 'assistant', content: 'ok' }],
      });
    }
  }
  ```
- Override provider in `TestingModule`:
  ```ts
  TestingModule.overrideProvider(LLMService).useClass(MockLlmService);
  ```

## 7. Integration in `LlmModule`

```ts
// ... in llm.module.ts
@Module({
  imports: [HttpModule],
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
