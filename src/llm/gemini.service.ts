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
  SystemPromptPayload,
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

  private isSystemPrompt(payload: LlmPayload): payload is SystemPromptPayload {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'system' in payload &&
      'user' in payload
    );
  }

  private buildModelParams(payload: LlmPayload): ModelParams {
    const modelName = this.isMultimodal(payload)
      ? 'gemini-2.5-flash'
      : 'gemini-2.0-flash-lite';

    const modelParams: ModelParams = { model: modelName };

    if (this.isSystemPrompt(payload)) {
      modelParams.systemInstruction = payload.system;
    }

    return modelParams;
  }

  private buildContents(payload: LlmPayload): (string | Part)[] {
    if (this.isSystemPrompt(payload)) {
      // If payload.user is already an array of Parts, return it directly.
      // Otherwise, wrap the string in a Part object.
      return Array.isArray(payload.user)
        ? payload.user
        : [{ text: payload.user }];
    } else if (this.isMultimodal(payload)) {
      const { messages, images } = payload;
      const textPart = { text: messages[0].content };
      const imageParts: Part[] = images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      }));
      return [textPart, ...imageParts];
    }

    // Handle string payload
    return [payload as string];
  }
}
