import { Prompt } from './prompt.base';
import { readMarkdown } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * A prompt for assessing text-based tasks.
 */
export class TextPrompt extends Prompt {
  /**
   * Initializes the TextPrompt instance.
   * @param inputs The prompt inputs.
   * @param userTemplateName The name of the user template file.
   * @param systemPrompt The system prompt string.
   */
  constructor(
    inputs: unknown,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    super(inputs, userTemplateName ?? 'text.user.prompt.md', systemPrompt);
  }

  /**
   * Builds the LLM payload for a text-based assessment.
   * @returns A Promise that resolves to the LlmPayload.
   */
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
