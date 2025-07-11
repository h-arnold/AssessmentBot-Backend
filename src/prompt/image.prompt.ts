import * as fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { Prompt, PromptInput } from './prompt.base';

export class ImagePrompt extends Prompt {
  private readonly images: { path: string; mimeType: string }[];

  constructor(
    inputs: PromptInput,
    images?: { path: string; mimeType: string }[],
  ) {
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
      const data = await this.readImageFile(image.path);
      return { data, mimeType: image.mimeType };
    });

    const images = await Promise.all(imagePromises);

    return {
      messages: [promptText],
      images,
    };
  }

  async readImageFile(imagePath: string): Promise<string> {
    // Only allow reading from the Prompts directory
    const baseDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../docs/ImplementationPlan/Stage6/Prompts',
    );
    const resolvedPath = path.resolve(baseDir, imagePath);
    if (!resolvedPath.startsWith(baseDir)) {
      throw new Error('Unauthorised file path');
    }
    return await fs.readFile(resolvedPath, { encoding: 'base64' });
  }
}
