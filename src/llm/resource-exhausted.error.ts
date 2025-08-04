/**
 * Custom error class for Gemini API resource exhausted errors.
 * This error is thrown when the API quota has been exceeded and should bubble up
 * to inform the calling code that no retries should be attempted.
 */
export class ResourceExhaustedError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'ResourceExhaustedError';
  }
}
