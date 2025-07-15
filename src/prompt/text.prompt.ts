import { Prompt } from './prompt.base';
import { readMarkdown } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Represents a text-based prompt that extends the base `Prompt` class.
 * This class is responsible for building a message by rendering a markdown template
 * with specific task-related data.
 */
export class TextPrompt extends Prompt {
  constructor(
    inputs: unknown,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    super(inputs, userTemplateName ?? 'text.user.prompt.md', systemPrompt);
  }

  public async buildMessage(): Promise<LlmPayload> {
    this.logger.debug('Building message for TextPrompt');
    const userTemplate = await readMarkdown(this.userTemplateName!);
    const userMessage = this.render(userTemplate, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });
    this.logger.debug(`Rendered user message length: ${userMessage.length}`);
    return {
      system: this.systemPrompt ?? '',
      user: userMessage,
    };
  }
}
