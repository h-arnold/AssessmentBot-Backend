import { LlmResponse } from './types';

export type ImagePromptPayload = {
  messages: { content: string }[];
  images: { mimeType: string; data: string }[];
};

export type LlmPayload =
  | string
  | ImagePromptPayload
  | { system: string; user: string }
  | {
      system: string;
      messages: { content: string }[];
      images: { mimeType: string; data: string }[];
    };

export abstract class LLMService {
  /**
   * Send a payload to the LLM provider.
   * @param payload - Can be a rendered prompt string or an object with messages and attachments.
   * @returns A Promise resolving to a validated LLM response payload.
   */
  abstract send(payload: LlmPayload): Promise<LlmResponse>;
}
