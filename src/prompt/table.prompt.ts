import { Prompt } from './prompt.base';
import { LlmPayload } from '../llm/llm.service.interface';
// ...existing code...

/**
 * Represents a prompt that generates a table-based message.
 * This class extends the `Prompt` class and provides functionality
 * to build a message by rendering a markdown template with specific
 * task-related data.
 */
export class TablePrompt extends Prompt {
  constructor(inputs: unknown) {
    super(inputs, 'table.user.prompt.md', 'table.system.prompt.md');
  }

  public async buildMessage(): Promise<LlmPayload> {
    const userTemplate = await this.readMarkdown(this.userTemplateName!);
    const userMessage = this.render(userTemplate, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });
    return {
      system: this.systemPrompt ?? '',
      user: userMessage,
    };
  }
}
