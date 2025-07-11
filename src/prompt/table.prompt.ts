import { Prompt } from './prompt.base';

/**
 * Represents a prompt that generates a table-based message.
 * This class extends the `Prompt` class and provides functionality
 * to build a message by rendering a markdown template with specific
 * task-related data.
 */
export class TablePrompt extends Prompt {
  public async buildMessage(): Promise<string> {
    const template = await this.readMarkdown('tablePrompt.md');
    return this.render(template, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });
  }
}
