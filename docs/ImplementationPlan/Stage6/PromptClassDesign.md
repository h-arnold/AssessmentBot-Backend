# Prompt Class Design

This design document describes the `Prompt` superclass, its subclasses, and the `PromptFactory` used to instantiate them. This approach decouples the client code from the concrete prompt implementations, adhering to SOLID principles.

## 1. Objectives

- Define a clear, modular class hierarchy for prompt types using a factory pattern.
- Store prompt scaffolds in Markdown templates for easy editing.
- Ensure runtime input validation with Zod.
- Support text, table and image-based prompts in a unified API.
- Integrate smoothly with NestJS dependency injection and the `LlmService` abstraction.

## 2. Directory Structure

```
src/
  prompt/
    prompt.base.ts       # Abstract Prompt class
    prompt.factory.ts    # PromptFactory class
    text.prompt.ts       # TextPrompt subclass
    table.prompt.ts      # TablePrompt subclass
    image.prompt.ts      # ImagePrompt subclass
    prompt.module.ts     # Module to provide the factory

docs/
  Prompts/
    textPrompt.md        # Text scaffold template
    tablePrompt.md       # Table scaffold template
    imagePrompt.md       # Image scaffold template
```

## 3. Dependencies

- `fs/promises` for file I/O
- `path` for resolving template files
- `zod` for runtime validation
- `mustache` for rendering templates
- NestJS common packages for providers and DI

Install mustache:

```bash
npm install mustache
```

## 4. Prompt Base Class (`prompt.base.ts`)

### Responsibilities

- Load a Markdown template from disk using a robust pathing strategy.
- Validate and store boundary inputs (reference, student, empty).
- Provide an abstract `buildMessage()` method for subclasses.
- Offer rendering helper methods.

### Fields

```ts
protected referenceTask: string;
protected studentTask: string;
protected emptyTask: string;
```

### Zod Schema

```ts
const PromptInputSchema = z.object({
  referenceTask: z.string(),
  studentTask: z.string(),
  emptyTask: z.string(),
});
```

### Methods

```ts
protected async readMarkdown(name: string): Promise<string> {
  // Note: Path resolves from the project root's 'dist' folder.
  // This requires assets to be copied during the build process.
  const file = path.resolve(process.cwd(), 'dist', 'Prompts', name);
  return fs.readFile(file, 'utf-8');
}

protected render(template: string, data: Record<string, string>): string {
  return mustache.render(template, data);
}

constructor(inputs: unknown) {
  const parsed = PromptInputSchema.parse(inputs);
  this.referenceTask = parsed.referenceTask;
  this.studentTask   = parsed.studentTask;
  this.emptyTask     = parsed.emptyTask;
}

public abstract buildMessage(): Promise<string | Record<string, any>>;
```

## 5. Subclasses

The `TextPrompt`, `TablePrompt`, and `ImagePrompt` subclasses remain as previously designed, inheriting from `Prompt` and implementing the `buildMessage` method. The `ImagePrompt` will still have its unique constructor signature to accept image data.

## 6. PromptFactory (`prompt.factory.ts`)

### Responsibilities

- Encapsulate the logic for creating the correct `Prompt` instance.
- Accept the `CreateAssessorDto` to access `taskType` and other necessary data.
- Be injectable as a NestJS provider.

### Class Definition

```ts
import { Injectable } from '@nestjs/common';
import { CreateAssessorDto } from '../assessor/dto/create-assessor.dto';
import { Prompt } from './prompt.base';
import { TextPrompt } from './text.prompt';
import { TablePrompt } from './table.prompt';
import { ImagePrompt } from './image.prompt';

@Injectable()
export class PromptFactory {
  public create(dto: CreateAssessorDto): Prompt {
    const inputs = {
      referenceTask: dto.reference,
      studentTask: dto.studentResponse,
      emptyTask: dto.template,
    };

    switch (dto.taskType) {
      case 'TEXT':
        return new TextPrompt(inputs);
      case 'TABLE':
        return new TablePrompt(inputs);
      case 'IMAGE':
        // Assuming image data is handled appropriately in the DTO
        return new ImagePrompt(inputs, dto.images);
      default:
        throw new Error(`Unsupported task type: ${dto.taskType}`);
    }
  }
}
```

## 7. Integration with NestJS

1.  **Prompt Module** (`src/prompt/prompt.module.ts`):
    The factory is provided within its own module.

    ```ts
    import { Module } from '@nestjs/common';
    import { PromptFactory } from './prompt.factory';

    @Module({
      providers: [PromptFactory],
      exports: [PromptFactory],
    })
    export class PromptModule {}
    ```

2.  **Assessor Module** (`src/assessor/assessor.module.ts`):
    The `AssessorModule` imports the `PromptModule` to make the factory available for injection.

    ```ts
    // ... other imports
    import { PromptModule } from '../prompt/prompt.module';

    @Module({
      imports: [/*...,*/ PromptModule],
      controllers: [AssessorController],
      providers: [AssessorService],
    })
    export class AssessorModule {}
    ```

3.  **AssessorService** (`src/assessor/assessor.service.ts`):
    The service is now decoupled from the concrete prompt classes.

    ```ts
    import { PromptFactory } from '../prompt/prompt.factory';
    // ...

    @Injectable()
    export class AssessorService {
      constructor(
        private readonly llmService: LLMService,
        private readonly promptFactory: PromptFactory,
      ) {}

      public async assess(dto: CreateAssessorDto): Promise<any> {
        const prompt = this.promptFactory.create(dto);
        const payload = await prompt.buildMessage();
        const llmResponse = await this.llmService.send(payload);
        // ... process response
      }
    }
    ```

## 9. Testing Strategy

Unit tests are crucial to validate the functionality of the prompt generation logic. Tests should be created for the factory and each concrete prompt class.

### 9.1. `PromptFactory` Test Cases (`prompt.factory.spec.ts`)

- **Objective**: Ensure the factory returns the correct prompt instance for each task type and handles invalid types gracefully.

| Test Case                                              | Inputs                                                                  | Expected Outcome                                                               |
| :----------------------------------------------------- | :---------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Should create a `TextPrompt`**                       | `CreateAssessorDto` with `taskType: 'TEXT'`                             | The factory returns an instance of `TextPrompt`.                               |
| **Should create a `TablePrompt`**                      | `CreateAssessorDto` with `taskType: 'TABLE'`                            | The factory returns an instance of `TablePrompt`.                              |
| **Should create an `ImagePrompt`**                     | `CreateAssessorDto` with `taskType: 'IMAGE'` and `images` array         | The factory returns an instance of `ImagePrompt`.                              |
| **Should throw an error for an unsupported task type** | `CreateAssessorDto` with `taskType: 'UNSUPPORTED_TYPE'`                 | The factory throws an `Error` with a message like "Unsupported task type".     |
| **Should pass constructor arguments correctly**        | A `CreateAssessorDto` with specific `reference`, `studentResponse` etc. | The created prompt instance should have its properties populated from the DTO. |

### 9.2. `Prompt` Base Class Test Cases (`prompt.base.spec.ts`)

- **Objective**: Validate the base class's constructor logic and input parsing.

| Test Case                                               | Inputs                                                                                             | Expected Outcome                                                           |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **Should parse valid inputs successfully**              | `inputs` object with all required string properties (`referenceTask`, `studentTask`, `emptyTask`). | The constructor completes without error, and properties are set correctly. |
| **Should throw Zod error for missing `referenceTask`**  | `inputs` object missing the `referenceTask` property.                                              | The constructor throws a `ZodError`.                                       |
| **Should throw Zod error for non-string `studentTask`** | `inputs` object where `studentTask` is a number.                                                   | The constructor throws a `ZodError`.                                       |
| **Should handle empty strings as valid input**          | `inputs` object where all properties are empty strings (`''`).                                     | The constructor completes without error.                                   |

### 9.3. `TextPrompt` Test Cases (`text.prompt.spec.ts`)

- **Objective**: Verify that the `TextPrompt` correctly reads its template and renders the final prompt string.
- **Dependencies**: Mock the `fs/promises.readFile` method to return the content of `docs/Prompts/textPrompt.md`.

| Test Case | Inputs - **Should build the final prompt string correctly** | Use the data from `docs/ImplementationPlan/Stage6/ExampleData/textTask.md`. - The `buildMessage()` method should return a string where `{referenceTask}`, `{studentTask}`, and `{emptyTask}` are replaced with the corresponding data. |

### 9.4. `TablePrompt` Test Cases (`table.prompt.spec.ts`)

- **Objective**: Verify that the `TablePrompt` correctly reads its template and renders the final prompt string.
- **Dependencies**: Mock `fs/promises.readFile` to return the content of `docs/Prompts/tablePrompt.md`.

| Test Case | Inputs - **Should build the final prompt string correctly** | Use the data from `docs/ImplementationPlan/Stage6/ExampleData/tableTask.md`. - The `buildMessage()` method should return a string where the markdown table data is correctly embedded. |

### 9.5. `ImagePrompt` Test Cases (`image.prompt.spec.ts`)

- **Objective**: Verify that the `ImagePrompt` correctly builds a structured payload with both text and image data.
- **Dependencies**: Mock `fs/promises.readFile` to return both the prompt template and fake image data (e.g., a base64 string).

| Test Case | Inputs - **Should build a structured payload with text and images** | `inputs` object for text, plus an `images` array with objects like `{ path: 'fake/path.png', mimeType: 'image/png' }`. - The `buildMessage()` method should return an object with a `messages` array (containing the rendered text) and an `images` array (containing the base64 data and mime types). |
| **Should handle multiple images** | `inputs` object with an `images` array containing three images. - The returned `images` array in the payload should contain three corresponding attachment objects. -

---

_All British English spellings used._
