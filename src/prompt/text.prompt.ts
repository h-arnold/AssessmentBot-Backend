
import { Prompt } from './prompt.base';

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
