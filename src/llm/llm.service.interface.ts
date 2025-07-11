import { LlmResponse } from './types';

export interface LLMService {
  /**
   * Send a payload to the LLM provider.
   * @param payload - Can be a rendered prompt string or an object with messages and attachments.
   * @returns A Promise resolving to a validated LLM response payload.
   */
  send(
    payload:
      | string
      | {
          messages: { content: string }[];
          images: { mimeType: string; data: string }[];
        },
  ): Promise<LlmResponse>;
}
