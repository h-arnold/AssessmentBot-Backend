import { Prompt } from './prompt.base';

/**
 * Represents a text-based prompt that extends the base `Prompt` class.
 * This class is responsible for building a message by rendering a markdown template
 * with specific task-related data.
 */
export class TextPrompt extends Prompt {
  public async buildMessage(): Promise<string> {
    const template = await this.readMarkdown('textPrompt.md');
    return this.render(template, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });
  }
}
