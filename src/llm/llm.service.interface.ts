import { LlmResponse } from './types';

/**
 * Represents the payload for a simple text-based prompt.
 */
export type StringPromptPayload = {
  /** The system instruction or context for the LLM. */
  system: string;
  /** The user-provided prompt or question. */
  user: string;
  /** Optional temperature for sampling (default: 0) */
  temperature?: number;
};

/**
 * Represents the payload for a multimodal prompt including images.
 */
export type ImagePromptPayload = {
  /** The system instruction or context for the LLM. */
  system: string;
  /** Array of images with their metadata. */
  images: Array<{ mimeType: string; data?: string; uri?: string }>;
  /** Optional messages array. */
  messages?: Array<{ content: string }>;
  /** Optional temperature for sampling (default: 0) */
  temperature?: number;
};

/**
 * A union type representing any possible payload structure for the LLM service.
 */
export type LlmPayload = ImagePromptPayload | StringPromptPayload;

/**
 * Defines the abstract class for a generic LLM service.
 * This abstraction allows for different LLM providers to be used interchangeably.
 */
export abstract class LLMService {
  /**
   * Sends a payload to the LLM provider to generate an assessment.
   *
   * @param payload The content to be sent to the LLM. This can be a simple string
   * or a complex object for multimodal inputs (e.g., text and images).
   * The payload may include an optional `temperature` parameter (default: 0).
   * @returns A Promise that resolves to a validated LlmResponse object.
   */
  abstract send(payload: LlmPayload): Promise<LlmResponse>;
}
