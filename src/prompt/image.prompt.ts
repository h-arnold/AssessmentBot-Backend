import * as fs from 'fs/promises';
import path from 'path';

import { Prompt, PromptInput } from './prompt.base';
import { getCurrentDirname } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

export class ImagePrompt extends Prompt {
  // ImagePrompt does not use a user template, so override with custom logic
  protected async buildUserMessageParts(): Promise<
    import('@google/generative-ai').Part[]
  > {
    // For image prompts, this could return an empty array or a basic structure
    return [];
  }
  private readonly images: { path: string; mimeType: string }[];

  constructor(
    inputs: PromptInput,
    images?: { path: string; mimeType: string }[],
    systemPrompt?: string,
  ) {
    super(inputs, undefined, systemPrompt);
    this.images = images || [];
  }

  public async buildMessage(): Promise<LlmPayload> {
    // For image prompts, the user message is a combination of the rendered system prompt
    // and the structured inputs.

    // Handle the images

    let images: { data: string; mimeType: string }[];
    if (this.images.length > 0) {
      images = await this.buildImagesFromFiles();
    } else {
      images = this.buildImagesFromDataUris();
    }

    return {
      system: this.systemPrompt ?? '',
      user: '',
      images,
    };
  }

  /**
   * Helper to build images payload from file paths
   */
  private async buildImagesFromFiles(): Promise<
    { data: string; mimeType: string }[]
  > {
    const imagePromises = this.images.map(async (image) => {
      const data = await this.readImageFile(image.path, image.mimeType);
      return { data, mimeType: image.mimeType };
    });
    return Promise.all(imagePromises);
  }

  /**
   * Helper to build images payload from data URIs in inputs
   */
  private buildImagesFromDataUris(): { data: string; mimeType: string }[] {
    // Assumes validation pipeline guarantees all three tasks are valid data URIs
    const parseDataUri = (uri: string): { data: string; mimeType: string } => {
      const match = /^data:(.+);base64,(.*)$/.exec(uri);
      if (!match) {
        throw new Error(`Invalid Data URI: ${uri.slice(0, 30)}...`);
      }
      const [, mimeType, data] = match;
      return { mimeType, data };
    };
    const images: { data: string; mimeType: string }[] = [];
    images.push(parseDataUri(this.referenceTask));
    images.push(parseDataUri(this.studentTask));
    images.push(parseDataUri(this.emptyTask));
    return images;
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
      '../../../docs/ImplementationPlan/Stage6/ExampleData/ImageTasks',
    );
    const relativePath = path.join(baseDir, imagePath);
    if (!relativePath.startsWith(baseDir)) {
      throw new Error('Unauthorised file path');
    }
    // Security: Path is validated above, safe to read
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return await fs.readFile(relativePath, { encoding: 'base64' });
  }
}
