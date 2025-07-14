import { Part } from '@google/generative-ai';
import { Part } from '@google/generative-ai';

import { Prompt } from './prompt.base';
import { Prompt } from './prompt.base';
import { SystemPromptPayload } from '../llm/llm.service.interface';
import { SystemPromptPayload } from '../llm/llm.service.interface';

/**
 * Represents a text-based prompt that extends the base `Prompt` class.
 * This class is responsible for building a message by rendering a markdown template
 * with specific task-related data.
 */
export class TextPrompt extends Prompt {
  protected async buildUserMessageParts(): Promise<Part[]> {
    return [
      { text: '## Reference Task\n\n### This task would score 5 across all criteria\n\n' },
      { text: this.referenceTask },
      { text: '\n\n## Empty Task\n\n### This task would score 0 across all criteria\n\n' },
      { text: this.emptyTask },
      { text: '\n\n## Student Task\n\n### This is the task you are assessing\n\n' },
      { text: this.studentTask },
    ];
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
