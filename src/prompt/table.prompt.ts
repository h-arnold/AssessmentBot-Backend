import type { Part } from '@google/generative-ai';

import { Prompt } from './prompt.base';
import { LlmPayload } from '../llm/llm.service.interface';
// ...existing code...

/**
 * Represents a prompt that generates a table-based message.
 * This class extends the `Prompt` class and provides functionality
 * to build a message by rendering a markdown template with specific
 * task-related data.
 */
export class TablePrompt extends Prompt {
  constructor(inputs: unknown) {
    super(inputs, 'table.user.prompt.md', 'table.system.prompt.md');
  }

  public async buildMessage(): Promise<LlmPayload> {
    const userParts = await this.buildUserMessageParts();
    // Flatten parts into a single string for user
    const userMessage = userParts.map((part) => part.text).join('');
    return {
      system: this.systemPrompt ?? '',
      user: userMessage,
    };
  }
}
