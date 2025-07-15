import { LlmResponse } from './types';

export type StringPromptPayload = {
  system: string;
  user: string;
};

export type ImagePromptPayload = {
  system: string;
  messages: { content: string }[];
  images: { mimeType: string; data: string }[];
};

export type LlmPayload = ImagePromptPayload | StringPromptPayload;

export abstract class LLMService {
  /**
   * Send a payload to the LLM provider.
   * @param payload - Can be a rendered prompt string or an object with messages and attachments.
   * @returns A Promise resolving to a validated LLM response payload.
   */
  abstract send(payload: LlmPayload): Promise<LlmResponse>;
}
