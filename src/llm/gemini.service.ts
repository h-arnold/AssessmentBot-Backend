import {
  GenerateContentRequest,
  GoogleGenerativeAI,
  Part,
} from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jsonrepair } from 'jsonrepair';

import { LLMService } from './llm.service.interface';
import { LlmResponse, LlmResponseSchema } from './types';

@Injectable()
export class GeminiService implements LLMService {
  private readonly client: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.client = new GoogleGenerativeAI(apiKey);
  }

  public async send(
    payload:
      | string
      | {
          messages: { content: string }[];
          images: { mimeType: string; data: string }[];
        },
  ): Promise<LlmResponse> {
    const modelName = this.isMultimodal(payload)
      ? 'gemini-pro-vision'
      : 'gemini-pro';
    const model = this.client.getGenerativeModel({ model: modelName });

    const request = this.buildRequest(payload);

    try {
      const result = await model.generateContent(request);
      const responseText = result.response.text();
      const repairedJson = jsonrepair(responseText);
      const parsedJson = JSON.parse(repairedJson);

      // Validate the parsed JSON against the Zod schema
      return LlmResponseSchema.parse(parsedJson);
    } catch (error) {
      this.logger.error(
        'Error communicating with or validating response from Gemini API',
        error,
      );
      // Handle ZodErrors specifically if needed, otherwise re-throw
      throw new Error(
        'Failed to get a valid and structured response from the LLM.',
      );
    }
  }

  private isMultimodal(
    payload:
      | string
      | {
          messages: { content: string }[];
          images: { mimeType: string; data: string }[];
        },
  ): boolean {
    return typeof payload === 'object' && payload.hasOwnProperty('images');
  }

  private buildRequest(
    payload:
      | string
      | {
          messages: { content: string }[];
          images: { mimeType: string; data: string }[];
        },
  ): GenerateContentRequest {
    if (typeof payload === 'string') {
      return { contents: [{ role: 'user', parts: [{ text: payload }] }] };
    }

    const { messages, images } = payload;
    const textPart = { text: messages[0].content };

    const imageParts: Part[] = images.map(
      (img: { mimeType: string; data: string }) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      }),
    );

    return { contents: [{ role: 'user', parts: [textPart, ...imageParts] }] };
  }
}
