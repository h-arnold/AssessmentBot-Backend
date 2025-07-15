import { Prompt } from './prompt.base';
import { readMarkdown } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Represents a prompt that generates a table-based message.
 * This class extends the `Prompt` class and provides functionality
 * to build a message by rendering a markdown template with specific
 * task-related data.
 */
export class TablePrompt extends Prompt {
  constructor(
    inputs: unknown,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    super(inputs, userTemplateName ?? 'table.user.prompt.md', systemPrompt);
  }

  public async buildMessage(): Promise<LlmPayload> {
    const userTemplate = await readMarkdown(this.userTemplateName!);
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
