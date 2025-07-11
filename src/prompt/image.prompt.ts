
import * as fs from 'fs/promises';

import { Prompt, PromptInput } from './prompt.base';

export class ImagePrompt extends Prompt {
  private readonly images: { path: string; mimeType: string }[];

  constructor(inputs: PromptInput, images?: { path: string; mimeType: string }[]) {
    super(inputs);
    this.images = images || [];
  }

  public async buildMessage(): Promise<object> {
    const template = await this.readMarkdown('imagePrompt.md');
    const promptText = this.render(template, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
    });

    const imagePromises = this.images.map(async (image) => {
      const data = await fs.readFile(image.path, 'base64');
      return { data, mimeType: image.mimeType };
    });

    const images = await Promise.all(imagePromises);

    return {
      messages: [promptText],
      images,
    };
  }
}
