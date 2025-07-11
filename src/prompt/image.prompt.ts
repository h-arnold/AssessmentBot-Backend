import * as fs from 'fs/promises';
import path from 'path';

import { Prompt, PromptInput } from './prompt.base';
import { getCurrentDirname } from '../common/file-utils';

export class ImagePrompt extends Prompt {
  private readonly images: { path: string; mimeType: string }[];

  constructor(
    inputs: PromptInput,
    images?: { path: string; mimeType: string }[],
  ) {
    super(inputs);
    this.images = images || [];
  }

  /**
   * Builds a message object containing a rendered prompt text and associated images.
   *
   * This method reads a markdown template file, renders it with provided task data,
   * and processes a list of images to include their data and MIME types in the result.
   *
   * @returns {Promise<object>} A promise that resolves to an object containing:
   * - `messages`: An array with the rendered prompt text.
   * - `images`: An array of objects, each containing:
   *   - `data`: The binary data of the image.
   *   - `mimeType`: The MIME type of the image.
   *
   * @throws {Error} If reading the markdown template or image files fails.
   */
  public async buildMessage(): Promise<object> {
    const template = await this.readMarkdown('imagePrompt.md');
    const promptText = this.render(template, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
    });

    const imagePromises = this.images.map(async (image) => {
      const data = await this.readImageFile(image.path, image.mimeType);
      return { data, mimeType: image.mimeType };
    });

    const images = await Promise.all(imagePromises);

    return {
      messages: [promptText],
      images,
    };
  }

  /**
   * Reads an image file from the specified path and returns its content as a base64-encoded string.
   *
   * @param imagePath - The relative path to the image file within the allowed directory.
   *                    Path traversal is blocked to ensure security.
   * @param mimeType - The MIME type of the image file. Must be one of the allowed MIME types
   *                   specified in the `ALLOWED_IMAGE_MIME_TYPES` environment variable.
   *                   Defaults to 'image/png' if not provided.
   * @returns A promise that resolves to the base64-encoded content of the image file.
   *
   * @throws {Error} If the `imagePath` contains path traversal (`..`).
   * @throws {Error} If the `mimeType` is not allowed based on the environment configuration.
   * @throws {Error} If the resolved file path is outside the authorized directory.
   *
   * @remarks
   * - The method ensures security by validating the file path and MIME type before reading the file.
   * - The base directory for image files is restricted to `docs/ImplementationPlan/Stage6/Prompts`.
   * - The file path validation prevents unauthorized access to files outside the allowed directory.
   * - The MIME type validation ensures only specific image types are processed.
   */
  async readImageFile(imagePath: string, mimeType?: string): Promise<string> {
    // Security: Only allow reading from the Prompts directory, and block path traversal
    if (imagePath.includes('..')) {
      throw new Error('Invalid image filename');
    }
    // Get allowed MIME types from environment
    const allowedMimeTypes = (
      process.env.ALLOWED_IMAGE_MIME_TYPES || 'image/png'
    )
      .split(',')
      .map((type) => type.trim().toLowerCase());
    if (!mimeType || !allowedMimeTypes.includes(mimeType.toLowerCase())) {
      throw new Error('Disallowed image MIME type');
    }
    const baseDir = path.join(
      getCurrentDirname(),
      '../../../docs/ImplementationPlan/Stage6/Prompts',
    );
    const relativePath = path.join(baseDir, imagePath);
    if (!relativePath.startsWith(baseDir)) {
      throw new Error('Unauthorised file path');
    }
    // Security: Path is validated above, safe to read
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return await fs.readFile(imagePath, { encoding: 'base64' });
  }
}
