import { GoogleGenerativeAI, ModelParams, Part } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ZodError } from 'zod';

import {
  ImagePromptPayload,
  LLMService,
  LlmPayload,
  StringPromptPayload,
} from './llm.service.interface';
import { LlmResponse, LlmResponseSchema } from './types';
import { JsonParserUtil } from '../common/json-parser.util';
import { ConfigService } from '../config/config.service';

/**
 * A service for interacting with the Google Gemini LLM.
 * It implements the LLMService interface and handles the specifics of
 * sending requests and validating responses from the Gemini API.
 */
@Injectable()
export class GeminiService extends LLMService {
  private readonly client: GoogleGenerativeAI;
  private readonly geminiLogger = new Logger(GeminiService.name);

  constructor(
    configService: ConfigService,
    private readonly jsonParserUtil: JsonParserUtil,
  ) {
    super(configService);
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Internal method that sends a payload to the Gemini API to generate an assessment.
   * This method is called by the base class's send method, which handles retry logic.
   *
   * This method dynamically selects the appropriate Gemini model based on the payload type
   * (text-only or multimodal with images). It attempts to repair malformed JSON
   * in the response and validates the final structure against the LlmResponseSchema.
   *
   * @param payload The LlmPayload containing the prompt and any associated data.
   * @returns A Promise that resolves to a validated LlmResponse object.
   * @throws ZodError if the response validation fails.
   * @throws Error if the API call fails or the response is invalid.
   */
  protected async _sendInternal(payload: LlmPayload): Promise<LlmResponse> {
    const modelParams = this.buildModelParams(payload);
    const contents = this.buildContents(payload);

    this.geminiLogger.debug(
      `Sending to Gemini with model: ${modelParams.model}, temperature: ${
        modelParams.generationConfig?.temperature ?? 0
      }`,
    );
    this.logPayload(payload, contents);

    try {
      const model = this.client.getGenerativeModel(modelParams);
      const result = await model.generateContent(contents);
      const responseText = result.response.text?.() ?? '';

      this.geminiLogger.debug(`Raw response from Gemini: \n\n${responseText}`);

      const parsedJson = this.jsonParserUtil.parse(responseText);
      this.geminiLogger.debug(
        `Parsed JSON response: ${JSON.stringify(parsedJson, null, 2)}`,
      );

      // Handle cases where the LLM returns an array with a single object
      const dataToValidate = Array.isArray(parsedJson)
        ? parsedJson[0]
        : parsedJson;

      return LlmResponseSchema.parse(dataToValidate);
    } catch (error) {
      this.geminiLogger.debug(
        'Error communicating with or validating response from Gemini API',
        error,
      );
      if (error instanceof ZodError) {
        this.logger.error('Zod validation failed', error.issues);
        throw error;
      }
      
      // Let the original error bubble up - the base class will handle 
      // retry logic and error wrapping appropriately
      throw error;
    }
  }

  /**
   * Type guard to check if the payload is for an image prompt.
   * @param payload The payload to check.
   * @returns True if the payload is an ImagePromptPayload.
   */
  private isImagePromptPayload(
    payload: LlmPayload,
  ): payload is ImagePromptPayload {
    return 'images' in payload;
  }

  /**
   * Type guard to check if the payload is for a string prompt.
   * @param payload The payload to check.
   * @returns True if the payload is a StringPromptPayload.
   */
  private isStringPromptPayload(
    payload: LlmPayload,
  ): payload is StringPromptPayload {
    return 'user' in payload;
  }

  /**
   * Builds the model parameters for the Gemini API call.
   * @param payload The LlmPayload to be sent.
   * @returns The configured ModelParams object.
   */
  private buildModelParams(payload: LlmPayload): ModelParams {
    const modelName = this.isImagePromptPayload(payload)
      ? 'gemini-2.5-flash'
      : 'gemini-2.0-flash-lite';

    const systemInstruction = payload.system;
    // Use temperature from payload, default to 0
    const temperature =
      typeof payload.temperature === 'number' ? payload.temperature : 0;

    return {
      model: modelName,
      systemInstruction,
      generationConfig: { temperature },
    };
  }

  /**
   * Builds the contents for the Gemini API call.
   * @param payload The LlmPayload to be sent.
   * @returns An array of strings or Parts for the API call.
   */
  private buildContents(payload: LlmPayload): (string | Part)[] {
    if (this.isImagePromptPayload(payload)) {
      const { images, messages } = payload;
      const textPrompt =
        messages && messages.length > 0 ? messages[0].content : '';
      const imageParts = this.mapImageParts(images);
      return [textPrompt, ...imageParts];
    }
    if (this.isStringPromptPayload(payload)) {
      return [payload.user];
    }
    // This case should not be reachable if the payload is validated correctly
    throw new Error('Unsupported payload type');
  }

  /**
   * Helper to map image payloads to Gemini API parts, ensuring the prompt follows the correct structure.
   * @param images An array of image objects.
   * @returns An array of Parts for the Gemini API.
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

  /**
   * Logs the payload being sent to Gemini, with different logging strategies based on payload type.
   * For StringPromptPayload: logs the full contents
   * For ImagePromptPayload: logs only the length of contents to avoid logging large image data
   * @param payload The original payload being sent
   * @param contents The processed contents array
   */
  private logPayload(payload: LlmPayload, contents: (string | Part)[]): void {
    if (this.isStringPromptPayload(payload)) {
      this.geminiLogger.debug(
        `String payload being sent: ${JSON.stringify(contents, null, 2)}`,
      );
    } else if (this.isImagePromptPayload(payload)) {
      this.geminiLogger.debug(
        `Image payload being sent with ${contents.length} content items`,
      );
    } else {
      this.geminiLogger.debug(
        `Unknown payload type being sent with ${contents.length} content items`,
      );
    }
  }
}
