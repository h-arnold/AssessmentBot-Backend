import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jsonrepair } from 'jsonrepair';

import { LLMService } from './llm.service.interface';
import { LlmResponse, LlmResponseSchema } from './types';

@Injectable()
export class GeminiService implements LLMService {
  private readonly client: GoogleGenAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.client = new GoogleGenAI({ apiKey });
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
    const contents = this.buildRequest(payload);
    try {
      const result = await this.client.models.generateContent({
        model: modelName,
        contents,
      });
      const responseText = result.text ?? '';
      const repairedJson = jsonrepair(responseText);
      const parsedJson = JSON.parse(repairedJson);
      return LlmResponseSchema.parse(parsedJson);
    } catch (error) {
      this.logger.error(
        'Error communicating with or validating response from Gemini API',
        error,
      );
      throw error;
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
    return typeof payload === 'object' && payload !== null && 'images' in payload;
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
    const imageParts = images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }));
    return [textPart, ...imageParts];
  }
}
