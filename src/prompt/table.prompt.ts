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
  protected async buildUserMessageParts(): Promise<Part[]> {
    const userTemplate = await this.readMarkdown('table.user.prompt.md');
    const userMessage = this.render(userTemplate, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });
    return [{ text: userMessage }];
  }

  public async buildMessage(): Promise<SystemPromptPayload> {
    const systemTemplate = await this.readMarkdown('table.system.prompt.md');
    const userParts = await this.buildUserMessageParts();

    return {
      system: systemTemplate,
      user: userParts,
    };
  }
}
