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
    // Read and render the user prompt template for text tasks
    const userTemplate = await this.readMarkdown('text.user.prompt.md');
    const userMessage = this.render(userTemplate, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });
    return [{ text: userMessage }];
  }

  public async buildMessage(): Promise<SystemPromptPayload> {
    this.logger.debug('Building message for TextPrompt');
    const systemTemplate = await this.readMarkdown('text.system.prompt.md');
    const userParts = await this.buildUserMessageParts();
    // Flatten parts into a single string for user
    const userMessage = userParts.map((part) => part.text).join('');
    this.logger.debug(`Rendered user message length: ${userMessage.length}`);
    return {
      system: systemTemplate,
      user: userMessage,
    };
  }
}
