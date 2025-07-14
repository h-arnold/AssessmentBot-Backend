import type { Part } from '@google/generative-ai';

import { Prompt } from './prompt.base';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Represents a text-based prompt that extends the base `Prompt` class.
 * This class is responsible for building a message by rendering a markdown template
 * with specific task-related data.
 */
export class TextPrompt extends Prompt {
  constructor(inputs: unknown) {
    super(inputs, 'text.user.prompt.md', 'text.system.prompt.md');
  }

  public async buildMessage(): Promise<LlmPayload> {
    this.logger.debug('Building message for TextPrompt');
    const userParts = await this.buildUserMessageParts();
    // Flatten parts into a single string for user
    const userMessage = userParts.map((part) => part.text).join('');
    this.logger.debug(`Rendered user message length: ${userMessage.length}`);
    return {
      system: this.systemPrompt ?? '',
      user: userMessage,
    };
  }
}
