import * as fs from 'fs/promises';
import path from 'path';

import { Logger } from '@nestjs/common';

import { Prompt, PromptInput } from './prompt.base';
import { getCurrentDirname } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Prompt implementation for assessing image-based tasks.
 *
 * This class handles the creation of prompts for image assessment tasks,
 * supporting both file-based images and data URI encoded images. It manages
 * the conversion of image data into formats suitable for LLM processing
 * and implements security measures for file access.
 */
export class ImagePrompt extends Prompt {
  /**
   * Builds user message parts for image prompts.
   *
   * Image prompts handle content differently from text prompts and
   * typically don't require separate user message parts since the
   * images are included directly in the payload.
   *
   * @returns Promise resolving to an empty array of Parts
   */
  protected async buildUserMessageParts(): Promise<
    import('@google/generative-ai').Part[]
  > {
    // For image prompts, this could return an empty array or a basic structure
    return [];
  }
  private readonly images: { path: string; mimeType: string }[];

  /**
   * Initialises the ImagePrompt instance with image-specific configuration.
   *
   * @param inputs - Validated prompt input data containing image information
   * @param logger - Logger instance for recording image prompt operations
   * @param images - Optional array of image objects with file paths and MIME types
   * @param systemPrompt - Optional system prompt string providing context for image assessment
   */
  constructor(
    inputs: PromptInput,
    logger: Logger,
    images?: { path: string; mimeType: string }[],
    systemPrompt?: string,
  ) {
    super(inputs, logger, undefined, systemPrompt);
    this.images = images || [];
  }

  /**
   * Builds the LLM payload for an image-based assessment.
   *
   * Creates a payload suitable for multimodal LLMs that can process both
   * text and images. The method handles two scenarios:
   * 1. File-based images: reads image files from disk
   * 2. Data URI images: extracts image data from base64 encoded strings
   *
   * @returns Promise resolving to an LlmPayload containing system prompt and image data
   */
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
      images: images,
    };
  }

  /**
   * Builds image payload from file paths on the filesystem.
   *
   * Reads image files from disk and converts them to base64 format
   * suitable for LLM processing. This method is used when images
   * are provided as file references rather than embedded data.
   *
   * @returns Promise resolving to array of image data and MIME type objects
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
   * Builds image payload from data URIs embedded in the input.
   *
   * Extracts base64-encoded image data from data URI strings in the
   * input fields. This method assumes the validation pipeline has
   * already confirmed all image fields contain valid data URIs.
   *
   * @returns Array of image data and MIME type objects
   * @throws Error if any data URI is malformed
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
