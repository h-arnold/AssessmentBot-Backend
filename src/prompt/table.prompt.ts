import { Prompt } from './prompt.base';

/**
 * Represents a prompt that generates a table-based message.
 * This class extends the `Prompt` class and provides functionality
 * to build a message by rendering a markdown template with specific
 * task-related data.
 */
export class TablePrompt extends Prompt {
  public async buildMessage(): Promise<{ system: string; user: string }> {
    const systemTemplate = await this.readMarkdown('table.system.prompt.md');
    const userTemplate = await this.readMarkdown('table.user.prompt.md');

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
