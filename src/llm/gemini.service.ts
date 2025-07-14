import {
  Content,
  GoogleGenerativeAI,
  ModelParams,
  Part,
} from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ZodError } from 'zod';

import {
  ImagePromptPayload,
  LLMService,
  LlmPayload,
} from './llm.service.interface';
import { LlmResponse, LlmResponseSchema } from './types';
import { JsonParserUtil } from '../common/json-parser.util';
import { ConfigService } from '../config/config.service';

@Injectable()
export class GeminiService implements LLMService {
  private readonly client: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jsonParserUtil: JsonParserUtil,
  ) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  public async send(payload: LlmPayload): Promise<LlmResponse> {
    const modelParams = this.buildModelParams(payload);
    const contents = this.buildContents(payload);

    this.logger.debug(`Sending to Gemini with model: ${modelParams.model}`);
    this.logger.debug(
      `Payload being sent: ${JSON.stringify(contents, null, 2)}`,
    );

    try {
      const model = this.client.getGenerativeModel(modelParams);
      const result = await model.generateContent(contents);
      const responseText = result.response.text?.() ?? '';

      this.logger.debug(`Raw response from Gemini: ${responseText}`);

      const parsedJson = this.jsonParserUtil.parse(responseText);
      this.logger.debug(
        `Parsed JSON response: ${JSON.stringify(parsedJson, null, 2)}`,
      );

      // Handle cases where the LLM returns an array with a single object
      const dataToValidate = Array.isArray(parsedJson)
        ? parsedJson[0]
        : parsedJson;

      return LlmResponseSchema.parse(dataToValidate);
    } catch (error) {
      Logger.debug('--- Error in GeminiService.send ---');
      Logger.debug(error);
      Logger.debug('----------------------------------');
      this.logger.error(
        'Error communicating with or validating response from Gemini API',
        error,
      );
      if (error instanceof ZodError) {
        this.logger.error('Zod validation failed', error.errors);
        throw error;
      }
      throw new Error(
        'Failed to get a valid and structured response from the LLM.',
      );
    }
  }

  private isMultimodal(payload: LlmPayload): payload is ImagePromptPayload {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'images' in payload &&
      Array.isArray(payload.images)
    );
  }

  private buildModelParams(payload: LlmPayload): ModelParams {
    const modelName = this.isMultimodal(payload)
      ? 'gemini-2.5-flash'
      : 'gemini-2.0-flash-lite';

    return { model: modelName };
  }

  private buildContents(payload: LlmPayload): (string | Part)[] {
    if (this.isMultimodal(payload)) {
      const { images, messages } = payload;
      const textPrompt =
        messages && messages.length > 0 ? messages[0].content : '';
      const imageParts = this.mapImageParts(images);
      return [textPrompt, ...imageParts];
    }

    // Handle string payload
    return [payload as string];
  }

  /**
   * Helper to map image payloads to Gemini API parts, ensuring the prompt follows the correct structure.
   */
  private mapImageParts(
    images: Array<{ mimeType: string; data?: string; uri?: string }>,
  ): Part[] {
    return images
      .map((img) => {
        // URI-based image (uploaded)
        if (
          typeof img === 'object' &&
          'uri' in img &&
          typeof img.uri === 'string' &&
          typeof img.mimeType === 'string'
        ) {
          return {
            fileData: {
              uri: img.uri,
              mimeType: img.mimeType,
            },
          };
        }
        // Inline base64 image
        if (
          typeof img === 'object' &&
          'data' in img &&
          typeof img.data === 'string' &&
          typeof img.mimeType === 'string'
        ) {
          return {
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          };
        }
        // Fallback: skip invalid image
        return undefined;
      })
      .filter(Boolean) as Part[];
  }
}
