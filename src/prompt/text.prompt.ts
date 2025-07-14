import type { Part } from '@google/generative-ai';

import { Prompt } from './prompt.base';
import { SystemPromptPayload } from '../llm/llm.service.interface';

/**
 * Represents a text-based prompt that extends the base `Prompt` class.
 * This class is responsible for building a message by rendering a markdown template
 * with specific task-related data.
 */
export class TextPrompt extends Prompt {
  protected async buildUserMessageParts(): Promise<Part[]> {
    return this.buildDefaultUserMessageParts();
  }

  public async buildMessage(): Promise<SystemPromptPayload> {
    this.logger.debug('Building message for TextPrompt');
    const systemTemplate = await this.readMarkdown('text.system.prompt.md');
    const userParts = await this.buildUserMessageParts();

    this.logger.debug(`User message parts count: ${userParts.length}`);
    return {
      system: systemTemplate,
      user: userParts,
    };
  }
}
