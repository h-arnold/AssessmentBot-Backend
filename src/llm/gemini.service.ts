import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { jsonrepair } from 'jsonrepair';
import { ZodError } from 'zod';

import { LLMService } from './llm.service.interface';
import { LlmResponse, LlmResponseSchema } from './types';
import { ConfigService } from '../config/config.service';

@Injectable()
export class GeminiService implements LLMService {
  private readonly client: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment');
    }
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
      ? 'gemini-2.5-flash'
      : 'gemini-2.0-flash-lite';
    const contents = this.buildRequest(payload);
    try {
      // Use getGenerativeModel instead of models.generateContent
      const model = this.client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(contents);
      const responseText = result.response.text?.() ?? '';
      const repairedJson = jsonrepair(responseText);
      const parsedJson = JSON.parse(repairedJson);
      return LlmResponseSchema.parse(parsedJson);
    } catch (error) {
      this.logger.error(
        'Error communicating with or validating response from Gemini API',
        error,
      );
      // Re-throw ZodError to maintain specific error types for validation failures
      if (error instanceof ZodError) {
        throw error;
      }
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
    return (
      typeof payload === 'object' && payload !== null && 'images' in payload
    );
  }

  private buildRequest(
    payload:
      | string
      | {
          messages: { content: string }[];
          images: { mimeType: string; data: string }[];
        },
  ): (string | { inlineData: { mimeType: string; data: string } })[] {
    if (typeof payload === 'string') {
      return [payload];
    }
    const { messages, images } = payload;
    const textPart = messages[0].content;
    const imageParts = images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    }));
    return [textPart, ...imageParts];
  }
}
