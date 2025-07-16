import { Prompt } from './prompt.base';

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
}
