# Prompt Architecture

The prompt system in AssessmentBot-Backend provides a flexible and extensible framework for generating task-specific prompts that are sent to Large Language Models (LLMs) for student assessment. This document explains how the prompt system works and its key architectural components.

## Overview

The prompt system follows the **Factory Pattern** combined with **Template Method Pattern** to create type-specific prompts whilst maintaining consistency and code reuse. The architecture consists of three main layers:

1. **Abstract Base Layer** - Common functionality and validation
2. **Concrete Implementation Layer** - Task-specific prompt classes
3. **Factory Layer** - Orchestrates prompt creation and configuration

## Core Components

### Base Prompt Class

The `Prompt` abstract base class (`src/prompt/prompt.base.ts`) provides foundational functionality:

- **Input Validation**: Uses Zod schema validation for all prompt inputs
- **Template Rendering**: Mustache-based template system for dynamic content
- **Logging**: Comprehensive logging for debugging and monitoring
- **Common Interface**: Standardised `buildMessage()` method for LLM payload creation

```typescript
export abstract class Prompt {
  protected referenceTask: string;
  protected studentTask: string;
  protected emptyTask: string;
  protected readonly logger: Logger;

  public async buildMessage(): Promise<LlmPayload>;
}
```

### Input Schema

All prompts validate against the `PromptInputSchema`:

```typescript
export const PromptInputSchema = z.object({
  referenceTask: z.string(), // Model solution
  studentTask: z.string(), // Student's response
  emptyTask: z.string(), // Original task template
});
```

### Prompt Factory

The `PromptFactory` service (`src/prompt/prompt.factory.ts`) orchestrates prompt creation:

1. **Template Resolution**: Maps task types to appropriate template files
2. **System Prompt Loading**: Loads markdown templates from filesystem
3. **Prompt Instantiation**: Creates concrete prompt instances with proper configuration
4. **Error Handling**: Provides meaningful errors for unsupported task types

## Task Types and Implementations

### Text Prompts (`TextPrompt`)

- **Purpose**: Assessing written responses, essays, and textual submissions
- **Templates**: `text.system.prompt.md`, `text.user.prompt.md`
- **Rendering**: Standard Mustache template with reference/student/empty tasks

### Table Prompts (`TablePrompt`)

- **Purpose**: Evaluating tabular data submissions and structured content
- **Templates**: `table.system.prompt.md`, `table.user.prompt.md`
- **Rendering**: Similar to text but optimised for tabular content assessment

### Image Prompts (`ImagePrompt`)

- **Purpose**: Assessing visual submissions and multimodal content
- **Templates**: `image.system.prompt.md` (no user template - images are direct)
- **Special Handling**:
  - Supports both file-based and data URI image formats
  - Security validation for file paths and MIME types
  - Base64 encoding for LLM compatibility

## Template System

### Template Structure

Templates are markdown files stored in `src/prompt/templates/`:

- **System Prompts**: Define assessment criteria and LLM behaviour
- **User Prompts**: Structure the input data presentation using Mustache variables

### Template Variables

User templates can use these Mustache variables:

- `{{{referenceTask}}}` - The model/reference solution
- `{{{studentTask}}}` - The student's submission
- `{{{emptyTask}}}` - The original task template

### Example Template Usage

```markdown
## Reference Task

### This task would score 5 across all criteria

{{{referenceTask}}}

## Student Task

### This is the task you are assessing

{{{studentTask}}}
```

## Integration with Assessor Workflow

The prompt system integrates seamlessly with the broader assessment workflow:

1. **Controller Layer**: Receives `CreateAssessorDto` with task data
2. **Service Layer**: `AssessorService` calls `PromptFactory.create()`
3. **Prompt Creation**: Factory creates appropriate prompt instance
4. **Message Building**: Prompt renders templates and builds `LlmPayload`
5. **LLM Service**: Payload sent to LLM for processing

```typescript
// In AssessorService
async createAssessment(dto: CreateAssessorDto): Promise<LlmResponse> {
  const prompt = await this.promptFactory.create(dto);
  const message = await prompt.buildMessage();
  return this.llmService.send(message);
}
```

## Security Considerations

The prompt system includes several security measures:

- **Path Validation**: Prevents path traversal attacks in template loading
- **Input Sanitisation**: Zod validation ensures type safety
- **File Access Control**: Restricted to authorised template directories
- **MIME Type Validation**: For image prompts, only allowed image types are processed

## Error Handling

The system provides robust error handling:

- **Validation Errors**: Clear Zod error messages for invalid inputs
- **Template Errors**: Meaningful errors for missing or invalid templates
- **File System Errors**: Proper handling of template loading failures
- **Unsupported Types**: Clear error messages for unknown task types

## Performance Considerations

- **Template Caching**: Templates are loaded on-demand (could be optimised with caching)
- **Memory Efficiency**: Base64 image encoding is handled efficiently
- **Logging Levels**: Verbose logging for debugging without performance impact in production

This architecture provides a solid foundation for assessment prompt generation whilst maintaining extensibility for future task types and template modifications.
