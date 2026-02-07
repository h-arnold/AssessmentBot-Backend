import { Logger } from '@nestjs/common';

import { Prompt, PromptInput } from './prompt.base';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Prompt implementation for assessing image-based tasks.
 *
 * This class handles the creation of prompts for image assessment tasks,
 * supporting base64 data URI encoded images. It manages the conversion
 * of image data into formats suitable for LLM processing.
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

  /**
   * Initialises the ImagePrompt instance with image-specific configuration.
   *
   * @param inputs - Validated prompt input data containing image information
   * @param logger - Logger instance for recording image prompt operations
   * @param systemPrompt - Optional system prompt string providing context for image assessment
   */
  constructor(inputs: PromptInput, logger: Logger, systemPrompt?: string) {
    super(inputs, logger, undefined, systemPrompt);
  }

  /**
   * Builds the LLM payload for an image-based assessment.
   *
   * Creates a payload suitable for multimodal LLMs that can process both
   * text and images. Extracts image data from base64 encoded data URI strings.
   *
   * @returns Promise resolving to an LlmPayload containing system prompt and image data
   */
  public async buildMessage(): Promise<LlmPayload> {
    this.logger.debug(
      'Building image payload from data URI inputs in the request.',
    );
    const images = this.buildImagesFromDataUris();

    this.logger.log(`Built image payload with ${images.length} images.`);

    return {
      system: this.systemPrompt ?? '',
      images: images,
    };
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
        this.logger.error(
          `Invalid data URI encountered while building image prompt: ${uri.slice(0, 30)}...`,
        );
        throw new Error(`Invalid Data URI: ${uri.slice(0, 30)}...`);
      }
      const [, mimeType, data] = match;
      this.logger.debug(
        `Parsed data URI for ${mimeType} with ${data.length} base64 characters.`,
      );
      return { mimeType, data };
    };
    const images: { data: string; mimeType: string }[] = [];
    images.push(parseDataUri(this.referenceTask));
    images.push(parseDataUri(this.emptyTask));
    images.push(parseDataUri(this.studentTask));

    return images;
  }
}
