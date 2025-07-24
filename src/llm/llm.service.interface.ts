import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAIFetchError } from '@google/generative-ai';
import { ZodError } from 'zod';

import { LlmResponse } from './types';
import { ConfigService } from '../config/config.service';

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
 * Defines the base class for a generic LLM service with built-in retry logic for rate limiting.
 * This class provides exponential backoff retry functionality for 429 (rate limit) errors,
 * while allowing different LLM providers to be used interchangeably by implementing _sendInternal.
 */
@Injectable()
export abstract class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(protected readonly configService: ConfigService) {}

  /**
   * Sends a payload to the LLM provider to generate an assessment.
   * This method includes automatic retry logic with exponential backoff for 429 rate limit errors.
   *
   * @param payload The content to be sent to the LLM. This can be a simple string
   * or a complex object for multimodal inputs (e.g., text and images).
   * The payload may include an optional `temperature` parameter (default: 0).
   * @returns A Promise that resolves to a validated LlmResponse object.
   */
  async send(payload: LlmPayload): Promise<LlmResponse> {
    const maxRetries = this.configService.get('LLM_MAX_RETRIES');
    const baseBackoffMs = this.configService.get('LLM_BACKOFF_BASE_MS');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._sendInternal(payload);
      } catch (error) {
        const isRateLimitError = this.isRateLimitError(error);
        const isLastAttempt = attempt === maxRetries;

        if (!isRateLimitError || isLastAttempt) {
          // If it's not a rate limit error, or we've exhausted retries, 
          // wrap the error if it's not already a known error type
          if (error instanceof ZodError) {
            throw error;
          }
          
          if (isRateLimitError && isLastAttempt) {
            // For rate limit errors that exceeded max retries, throw the original error
            throw error;
          }
          
          // For other errors, wrap them in a generic error message
          const errObj = error as Error;
          throw new Error(
            `Failed to get a valid and structured response from the LLM.\nOriginal error: ${errObj.message || error}\nStack: ${errObj.stack || 'N/A'}`,
          );
        }

        // Calculate exponential backoff delay
        const delay = baseBackoffMs * Math.pow(2, attempt);
        
        this.logger.warn(
          `Rate limit encountered on attempt ${attempt + 1}/${maxRetries + 1}. ` +
          `Retrying in ${delay}ms. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        await this.sleep(delay);
      }
    }

    // This should never be reached due to the logic above, but TypeScript requires it
    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Internal method that subclasses must implement to handle the actual LLM API call.
   * This method should not include retry logic, as that is handled by the base class.
   *
   * @param payload The LlmPayload to be sent to the specific LLM provider.
   * @returns A Promise that resolves to a validated LlmResponse object.
   */
  protected abstract _sendInternal(payload: LlmPayload): Promise<LlmResponse>;

  /**
   * Checks if an error is a rate limit error (HTTP 429).
   * @param error The error to check.
   * @returns True if the error is a rate limit error.
   */
  private isRateLimitError(error: unknown): boolean {
    // Check for Google Generative AI fetch errors with 429 status
    if (error instanceof GoogleGenerativeAIFetchError) {
      return (error as any).status === 429;
    }

    // Check for other error formats that might indicate rate limiting
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as any).status === 429;
    }

    // Check for error messages that might indicate rate limiting
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('rate limit') || 
             message.includes('too many requests') ||
             message.includes('quota exceeded');
    }

    return false;
  }

  /**
   * Utility method to sleep for a specified duration.
   * @param ms The number of milliseconds to sleep.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
