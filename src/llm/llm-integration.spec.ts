import { ResourceExhaustedError } from './resource-exhausted.error';

/**
 * Simple integration tests for ResourceExhaustedError that can be used
 * as examples for E2E test implementations.
 */
describe('ResourceExhaustedError Integration', () => {
  it('should be exportable and usable for E2E tests', () => {
    // E2E tests can import and use this error class like this:
    const error = new ResourceExhaustedError('API quota exhausted');
    
    expect(error).toBeInstanceOf(ResourceExhaustedError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ResourceExhaustedError');
    expect(error.message).toBe('API quota exhausted');
  });

  it('should preserve original error for debugging', () => {
    const originalError = new Error('RESOURCE_EXHAUSTED: Free tier quota exceeded');
    originalError.name = 'GoogleGenerativeAIFetchError';
    (originalError as any).status = 429;

    const resourceError = new ResourceExhaustedError(
      'API quota exhausted. Please try again later or upgrade your plan.',
      originalError
    );
    
    expect(resourceError.originalError).toBe(originalError);
    expect(resourceError.message).toBe('API quota exhausted. Please try again later or upgrade your plan.');
  });

  it('should support pattern matching for E2E error handling', () => {
    // E2E tests can use this pattern to distinguish quota errors
    const errors = [
      new Error('Network error'),
      new ResourceExhaustedError('Quota exceeded'),
      new Error('Rate limit exceeded'),
    ];

    const quotaErrors = errors.filter(err => err instanceof ResourceExhaustedError);
    expect(quotaErrors).toHaveLength(1);
    expect(quotaErrors[0].message).toBe('Quota exceeded');
  });

  it('should work in try-catch blocks for E2E tests', () => {
    const throwResourceExhaustedError = () => {
      throw new ResourceExhaustedError('API quota exhausted');
    };

    let caughtError: any = null;

    try {
      throwResourceExhaustedError();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError instanceof ResourceExhaustedError).toBe(true);
    expect(caughtError.message).toBe('API quota exhausted');
  });
});