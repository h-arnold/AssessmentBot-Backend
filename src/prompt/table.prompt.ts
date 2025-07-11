
import { Prompt } from './prompt.base';

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
