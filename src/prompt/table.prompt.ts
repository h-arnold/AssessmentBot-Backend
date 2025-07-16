import { Prompt } from './prompt.base';
/**
 * A prompt for assessing table-based tasks.
 */
export class TablePrompt extends Prompt {
  /**
   * Initializes the TablePrompt instance.
   * @param inputs The prompt inputs.
   * @param userTemplateName The name of the user template file.
   * @param systemPrompt The system prompt string.
   */
  constructor(
    inputs: unknown,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    super(inputs, userTemplateName ?? 'table.user.prompt.md', systemPrompt);
  }
}
