import { Logger } from '@nestjs/common';

import { Prompt } from './prompt.base';

/**
 * Prompt implementation for assessing text-based tasks.
 *
 * This class handles the creation of prompts for text assessment tasks,
 * using templates optimised for evaluating written responses, essays,
 * and other textual submissions. It inherits all common prompt functionality
 * from the base Prompt class.
 */
export class TextPrompt extends Prompt {
  /**
   * Initialises the TextPrompt instance with text-specific configuration.
   *
   * @param inputs - Raw input data to be validated containing text information
   * @param logger - Logger instance for recording text prompt operations
   * @param userTemplateName - Optional name of the user template file (defaults to text template)
   * @param systemPrompt - Optional system prompt string providing context for text assessment
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
