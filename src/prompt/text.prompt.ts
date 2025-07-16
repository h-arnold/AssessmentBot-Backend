import { Logger } from '@nestjs/common';

import { Prompt } from './prompt.base';

/**
 * A prompt for assessing text-based tasks.
 */
export class TextPrompt extends Prompt {
  /**
   * Initializes the TextPrompt instance.
   * @param inputs The prompt inputs.
   * @param logger The logger instance.
   * @param userTemplateName The name of the user template file.
   * @param systemPrompt The system prompt string.
   */
  constructor(
    inputs: unknown,
    logger: Logger,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    super(
      inputs,
      logger,
      userTemplateName ?? 'text.user.prompt.md',
      systemPrompt,
    );
  }
}
