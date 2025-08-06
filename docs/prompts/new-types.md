# Creating New Prompt Types

This guide explains how to add support for new assessment task types by extending the prompt system. The modular architecture makes it straightforward to add new prompt implementations whilst maintaining consistency with existing patterns.

## Overview

Adding a new prompt type involves:

1. **Defining the Task Type** - Add enum value and DTO schema
2. **Creating Prompt Implementation** - Extend the base Prompt class
3. **Adding Template Files** - Create system and user prompt templates
4. **Updating Factory Logic** - Register the new type in PromptFactory
5. **Writing Tests** - Ensure proper test coverage

## Step 1: Define the Task Type

### Add Enum Value

First, add your new task type to the `TaskType` enum in `src/v1/assessor/dto/create-assessor.dto.ts`:

```typescript
export enum TaskType {
  TEXT = 'TEXT',
  TABLE = 'TABLE',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO', // New task type
}
```

### Update DTO Schema

Add a new discriminated union case to `createAssessorDtoSchema`:

```typescript
export const createAssessorDtoSchema = z.discriminatedUnion('taskType', [
  // ... existing cases ...
  z
    .object({
      taskType: z.literal(TaskType.AUDIO),
      /**
       * The reference audio data for AUDIO taskType.
       * @example "data:audio/mp3;base64,//uQx..."
       */
      reference: z.string().min(1),
      /**
       * The template for AUDIO taskType.
       * @example "Record a 30-second pronunciation exercise."
       */
      template: z.string().min(1),
      /**
       * The student's response audio data for AUDIO taskType.
       * @example "data:audio/mp3;base64,//uQx..."
       */
      studentResponse: z.string().min(1),
      /**
       * Optional audio files array for additional context.
       */
      audioFiles: z
        .array(z.object({ path: z.string(), mimeType: z.string() }))
        .optional(),
    })
    .strict(),
]);
```

## Step 2: Create Prompt Implementation

Create a new prompt class that extends the base `Prompt` class:

```typescript
// src/prompt/audio.prompt.ts
import { Logger } from '@nestjs/common';
import { Prompt, PromptInput } from './prompt.base';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Prompt implementation for assessing audio-based tasks.
 *
 * This class handles the creation of prompts for audio assessment tasks,
 * supporting audio file processing and transcription-based evaluation.
 */
export class AudioPrompt extends Prompt {
  private readonly audioFiles: { path: string; mimeType: string }[];

  /**
   * Initialises the AudioPrompt instance with audio-specific configuration.
   *
   * @param inputs - Validated prompt input data containing audio information
   * @param logger - Logger instance for recording audio prompt operations
   * @param audioFiles - Optional array of audio file objects
   * @param systemPrompt - Optional system prompt for audio assessment context
   */
  constructor(
    inputs: PromptInput,
    logger: Logger,
    audioFiles?: { path: string; mimeType: string }[],
    systemPrompt?: string,
  ) {
    super(inputs, logger, 'audio.user.prompt.md', systemPrompt);
    this.audioFiles = audioFiles || [];
  }

  /**
   * Builds the LLM payload for audio-based assessment.
   * Override if special handling needed for audio processing.
   */
  public async buildMessage(): Promise<LlmPayload> {
    // For basic audio prompts, use the default text-based approach
    // Override this method if you need special audio processing
    return super.buildMessage();
  }

  /**
   * Processes audio files if needed for assessment.
   * This could include transcription, format conversion, etc.
   */
  private async processAudioFiles(): Promise<void> {
    // Implementation for audio file processing
    // This might involve calling audio processing services
  }
}
```

## Step 3: Create Template Files

### System Prompt Template

Create `src/prompt/templates/audio.system.prompt.md`:

````markdown
# Task

You are assessing an audio-based learning task. Focus on the specified assessment criteria whilst considering the unique aspects of audio submissions.

## Step 1:

Identify what the student is being asked to do by examining the reference task and template task. Explain it in no more than 2 sentences.

## Step 2:

Analyse the audio content (transcription provided) and identify the aspects of the work that the student has completed.

## Step 3:

Score the student's work on a sliding scale from 0-5 on the criteria below:

### 1. **Completeness** (0-5):

- Score 0 if no meaningful audio content provided.
- Score 5 if as comprehensive as the reference task.

### 2. **Accuracy** (0-5):

- Score 0 if content is entirely incorrect.
- Score 5 if matches the reference task in accuracy and detail.

### 3. **Audio Quality and Delivery** (0-5):

- Score 0 for unintelligible audio.
- Score 5 for clear, well-delivered audio content.

## Step 4:

Provide reasoning for each score (one sentence maximum).

## Step 5:

Output scores using this JSON structure:

```json
{
    "completeness": {
        "score": {score},
        "reasoning": "{reasoning}"
    },
    "accuracy": {
        "score": {score},
        "reasoning": "{reasoning}"
    },
    "audioQuality": {
        "score": {score},
        "reasoning": "{reasoning}"
    }
}
```
````

````

### User Prompt Template

Create `src/prompt/templates/audio.user.prompt.md`:

```markdown
## Reference Task
### This task would score 5 across all criteria
{{{referenceTask}}}

## Template Task
### This task would score 0 across all criteria
{{{emptyTask}}}

## Student Task
### This is the audio task you are assessing
{{{studentTask}}}
````

## Step 4: Update Factory Logic

Modify `PromptFactory` to handle the new task type:

```typescript
// In src/prompt/prompt.factory.ts

import { AudioPrompt } from './audio.prompt';

export class PromptFactory {
  // ... existing code ...

  private getPromptFiles(taskType: TaskType): {
    systemPromptFile?: string;
    userTemplateFile?: string;
  } {
    switch (taskType) {
      // ... existing cases ...
      case TaskType.AUDIO:
        return {
          systemPromptFile: 'audio.system.prompt.md',
          userTemplateFile: 'audio.user.prompt.md',
        };
      default:
        throw new Error(`Unsupported task type: ${String(taskType)}`);
    }
  }

  private instantiatePrompt(
    dto: CreateAssessorDto,
    inputs: unknown,
    userTemplateFile?: string,
    systemPrompt?: string,
  ): Prompt {
    switch (dto.taskType) {
      // ... existing cases ...
      case TaskType.AUDIO:
        return new AudioPrompt(
          inputs as PromptInput,
          this.logger,
          (dto as any).audioFiles, // Type assertion for new field
          systemPrompt,
        );
      default:
        throw new Error('Unsupported task type');
    }
  }
}
```

## Step 5: Write Tests

Create comprehensive tests for your new prompt type:

```typescript
// src/prompt/audio.prompt.spec.ts
import { Logger } from '@nestjs/common';
import { AudioPrompt } from './audio.prompt';

describe('AudioPrompt', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  const validInput = {
    referenceTask: 'Reference audio content',
    studentTask: 'Student audio content',
    emptyTask: 'Empty audio template',
  };

  describe('constructor', () => {
    it('should create an AudioPrompt instance successfully', () => {
      const prompt = new AudioPrompt(validInput, logger);
      expect(prompt).toBeInstanceOf(AudioPrompt);
    });

    it('should handle audio files parameter', () => {
      const audioFiles = [{ path: 'test.mp3', mimeType: 'audio/mp3' }];
      const prompt = new AudioPrompt(validInput, logger, audioFiles);
      expect(prompt).toBeInstanceOf(AudioPrompt);
    });
  });

  describe('buildMessage', () => {
    it('should build a valid LlmPayload', async () => {
      const prompt = new AudioPrompt(validInput, logger);
      const message = await prompt.buildMessage();

      expect(message).toHaveProperty('system');
      expect(message).toHaveProperty('user');
      expect(typeof message.system).toBe('string');
      expect(typeof message.user).toBe('string');
    });
  });
});
```

### Update Factory Tests

Add test cases to `prompt.factory.spec.ts`:

```typescript
describe('PromptFactory - Audio Tasks', () => {
  it('should create AudioPrompt for AUDIO task type', async () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.AUDIO,
      reference: 'Reference audio',
      template: 'Audio template',
      studentResponse: 'Student audio',
    };

    const prompt = await factory.create(dto);
    expect(prompt).toBeInstanceOf(AudioPrompt);
  });
});
```

## Best Practices

### Template Design

- **Clarity**: Make assessment criteria clear and specific to the task type
- **Consistency**: Follow the established JSON response format
- **Examples**: Include relevant examples for the new task type

### Error Handling

- **Validation**: Ensure proper input validation for task-specific fields
- **File Handling**: Implement secure file processing for media types
- **Fallbacks**: Provide meaningful error messages for processing failures

### Performance

- **Lazy Loading**: Only process files when necessary
- **Resource Cleanup**: Properly dispose of temporary files or resources
- **Caching**: Consider caching strategies for frequently accessed templates

### Documentation

- **JSDoc**: Comprehensive documentation for all public methods
- **Examples**: Include usage examples in your prompt class
- **Migration Notes**: Document any breaking changes or special requirements

## Integration Testing

Test your new prompt type end-to-end:

```typescript
// In test/assessor.e2e-spec.ts
describe('Audio Assessment (e2e)', () => {
  it('/v1/assess (POST) should handle audio tasks', () => {
    return request(app.getHttpServer())
      .post('/v1/assess')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        taskType: 'AUDIO',
        reference: 'Reference audio content',
        template: 'Audio task template',
        studentResponse: 'Student audio response',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('completeness');
        expect(res.body).toHaveProperty('accuracy');
        expect(res.body).toHaveProperty('audioQuality');
      });
  });
});
```

This structured approach ensures your new prompt type integrates seamlessly with the existing system whilst maintaining code quality and test coverage.
