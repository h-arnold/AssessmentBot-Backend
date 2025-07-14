import type { Part } from '@google/generative-ai';

import { Prompt } from './prompt.base';
import { SystemPromptPayload } from '../llm/llm.service.interface';

/**
 * Represents a prompt that generates a table-based message.
 * This class extends the `Prompt` class and provides functionality
 * to build a message by rendering a markdown template with specific
 * task-related data.
 */
export class TablePrompt extends Prompt {
  constructor(inputs: unknown) {
    super(inputs, 'table.user.prompt.md');
  }

  public async buildMessage(): Promise<SystemPromptPayload> {
    const systemTemplate = await this.readMarkdown('table.system.prompt.md');
    const userParts = await this.buildUserMessageParts();
    // Flatten parts into a single string for user
    const userMessage = userParts.map((part) => part.text).join('');
    return {
      system: systemTemplate,
      user: userMessage,
    };
  }
}
