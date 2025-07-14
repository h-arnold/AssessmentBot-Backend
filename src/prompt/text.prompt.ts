import { Prompt } from './prompt.base';

/**
 * Represents a text-based prompt that extends the base `Prompt` class.
 * This class is responsible for building a message by rendering a markdown template
 * with specific task-related data.
 */
export class TextPrompt extends Prompt {
  public async buildMessage(): Promise<{ system: string; user: string }> {
    const systemTemplate = await this.readMarkdown('text.system.prompt.md');
    const userTemplate = await this.readMarkdown('text.user.prompt.md');

    const userMessage = this.render(userTemplate, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });

    return {
      system: systemTemplate,
      user: userMessage,
    };
  }
}
