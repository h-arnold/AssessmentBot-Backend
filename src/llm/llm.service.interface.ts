import { Injectable, Logger } from '@nestjs/common';
import { ZodError } from 'zod';

import { ResourceExhaustedError } from './resource-exhausted.error';
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
  protected readonly logger = new Logger(LLMService.name);

  constructor(protected readonly configService: ConfigService) {}

  /**
   * Sends a payload to the LLM provider to generate an assessment.
   * This method includes automatic retry logic with exponential backoff for 429 rate limit errors.
   * Resource exhausted errors (quota exceeded) are not retried and bubble up immediately.
   *
   * @param payload The content to be sent to the LLM. This can be a simple string
   * or a complex object for multimodal inputs (e.g., text and images).
   * The payload may include an optional `temperature` parameter (default: 0).
   * @returns A Promise that resolves to a validated LlmResponse object.
   * @throws ResourceExhaustedError if the API quota has been exceeded.
   */
  async send(payload: LlmPayload): Promise<LlmResponse> {
    const maxRetries = this.configService.get('LLM_MAX_RETRIES');
    const baseBackoffMs = this.configService.get('LLM_BACKOFF_BASE_MS');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._sendInternal(payload);
      } catch (error) {
        // Check for resource exhausted errors first - these should bubble up immediately
        if (this.isResourceExhaustedError(error)) {
          throw new ResourceExhaustedError(
            'API quota exhausted. Please try again later or upgrade your plan.',
            error,
          );
        }

        const isRateLimitError = this.isRateLimitError(error);
        const isLastAttempt = attempt === maxRetries;

        if (!isRateLimitError || isLastAttempt) {
          // If it's not a rate limit error, or we've exhausted retries,
          // wrap the error if it's not already a known error type
          if (isRateLimitError || error instanceof ZodError) {
            throw error; // Throw original error for rate limits or Zod errors
          }

          const errObj = error as Error;
          throw new Error(
            `Failed to get a valid and structured response from the LLM.\nOriginal error: ${errObj.message || error}\nStack: ${errObj.stack || 'N/A'}`,
          );
        }

        // Calculate exponential backoff delay
        const delay =
          baseBackoffMs * Math.pow(2, attempt) + Math.random() * 100;

        this.logger.warn(
          `Rate limit encountered on attempt ${attempt + 1}/${maxRetries + 1}. ` +
            `Retrying in ${delay}ms. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Checks if an error is a resource exhausted error (HTTP 429 with specific patterns).
   * Resource exhausted errors indicate API quota limits have been reached and should
   * not be retried.
   * @param error The error to check.
   * @returns True if the error is a resource exhausted error.
   */
  private isResourceExhaustedError(error: unknown): boolean {
    // Use the utility function to extract status code from various error formats
    const statusCode = this.extractErrorStatusCode(error);

    // Must be a 429 error to be resource exhausted
    if (statusCode !== 429) {
      return false;
    }

    // Check for resource exhausted patterns in error messages
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('resource_exhausted') ||
        message.includes('resource exhausted') ||
        message.includes('quota exceeded') ||
        message.includes('quota exhausted') ||
        message.includes('quota has been exhausted')
      );
    }

    return false;
  }

  /**
   * Checks if an error is a rate limit error (HTTP 429) that should be retried.
   * This method excludes resource exhausted errors which should not be retried.
   * @param error The error to check.
   * @returns True if the error is a retryable rate limit error.
   */
  private isRateLimitError(error: unknown): boolean {
    // First check if it's a resource exhausted error - those shouldn't be retried
    if (this.isResourceExhaustedError(error)) {
      return false;
    }

    // Use the utility function to extract status code from various error formats
    const statusCode = this.extractErrorStatusCode(error);
    if (statusCode === 429) {
      return true;
    }

    // Check for error messages that might indicate retryable rate limiting
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') || message.includes('too many requests')
      );
    }

    return false;
  }

  /**
   * Utility function to extract HTTP status code from various error formats.
   * This is designed to work with different LLM SDK error structures.
   * @param error The error to extract status code from.
   * @returns The HTTP status code if found, undefined otherwise.
   */
  private extractErrorStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    // Check for status property directly
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }

    // Check for statusCode property (alternative naming)
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }

    // Check for response.status (nested in response object)
    if (
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response &&
      typeof (error.response as Record<string, unknown>).status === 'number'
    ) {
      return (error.response as Record<string, unknown>).status as number;
    }

    return undefined;
  }

  /**
   * Utility method to sleep for a specified duration.
   * @param ms The number of milliseconds to sleep.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
