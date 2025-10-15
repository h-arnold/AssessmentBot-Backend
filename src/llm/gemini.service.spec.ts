import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { ZodError } from 'zod';

import { GeminiService } from './gemini.service';
import {
  ImagePromptPayload,
  StringPromptPayload,
} from './llm.service.interface';
import { ResourceExhaustedError } from './resource-exhausted.error';
import { JsonParserUtil } from '../common/json-parser.util';
import { ConfigService } from '../config/config.service';

// Only mock the GoogleGenerativeAI class, not the error classes
jest.mock('@google/generative-ai', () => {
  const actual = jest.requireActual('@google/generative-ai');
  return {
    ...actual,
    GoogleGenerativeAI: jest.fn(),
  };
});

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

const mockGoogleGenerativeAI = GoogleGenerativeAI as jest.Mock;
mockGoogleGenerativeAI.mockImplementation(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));

// Test fixtures and utilities
const createValidResponse = (
  score: number,
): { response: { text: () => string } } => ({
  response: {
    text: (): string =>
      `{"completeness": {"score": ${score}, "reasoning": "Test"}, "accuracy": {"score": ${score}, "reasoning": "Test"}, "spag": {"score": ${score}, "reasoning": "Test"}}`,
  },
});

const createStringPayload = (user: string = 'test'): StringPromptPayload => ({
  system: 'system prompt',
  user,
});

const createImagePayload = (): ImagePromptPayload => ({
  system: 'system prompt',
  messages: [{ content: 'Test message' }],
  images: [{ mimeType: 'image/png', data: 'test-data' }],
});

const expectValidResponse = (result: LlmResponse, score: number): void => {
  expect(result).toEqual({
    completeness: { score, reasoning: 'Test' },
    accuracy: { score, reasoning: 'Test' },
    spag: { score, reasoning: 'Test' },
  });
};

describe('GeminiService', () => {
  let service: GeminiService;
  let configService: ConfigService;
  let jsonParserUtil: JsonParserUtil;
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigService
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'test-api-key';
        if (key === 'LLM_BACKOFF_BASE_MS') return 100;
        if (key === 'LLM_MAX_RETRIES') return 2;
        return null;
      }),
    } as unknown as ConfigService;

    // Mock JsonParserUtil
    jsonParserUtil = {
      parse: jest.fn((json: string) => JSON.parse(json)),
    } as unknown as JsonParserUtil;

    service = new GeminiService(configService, jsonParserUtil);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialise the SDK correctly', () => {
    expect(mockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
  });

  describe('basic functionality', () => {
    it('should send a string payload and return a valid response', async () => {
      mockGenerateContent.mockResolvedValue(createValidResponse(1));

      const payload = createStringPayload('test prompt');
      const result = await service.send(payload);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-lite',
        systemInstruction: 'system prompt',
        generationConfig: { temperature: 0 },
      });
      expect(mockGenerateContent).toHaveBeenCalledWith(['test prompt']);
      expectValidResponse(result, 1);
    });

    it('should send a multimodal payload and return a valid response', async () => {
      mockGenerateContent.mockResolvedValue(createValidResponse(3));

      const payload = createImagePayload();
      const result = await service.send(payload);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        systemInstruction: 'system prompt',
        generationConfig: { temperature: 0 },
      });
      expect(mockGenerateContent).toHaveBeenCalledWith([
        'Test message',
        { inlineData: { mimeType: 'image/png', data: 'test-data' } },
      ]);
      expectValidResponse(result, 3);
    });

    it('should handle malformed JSON and still return a valid response', async () => {
      const malformedJson =
        '{"completeness": {"score": 4, "reasoning": "Test"}, "accuracy": {"score": 4, "reasoning": "Test"}, "spag": {"score": 4, "reasoning": "Test"},}';
      const repairedJson =
        '{"completeness": {"score": 4, "reasoning": "Test"}, "accuracy": {"score": 4, "reasoning": "Test"}, "spag": {"score": 4, "reasoning": "Test"}}';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => malformedJson,
        },
      });

      (jsonParserUtil.parse as jest.Mock).mockReturnValueOnce(
        JSON.parse(repairedJson),
      );

      const payload = createStringPayload();
      await service.send(payload);

      expect(jsonParserUtil.parse).toHaveBeenCalledWith(malformedJson);
    });
  });

  describe('error handling', () => {
    it('should throw an error if the SDK fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('SDK Error'));

      const payload = createStringPayload();
      await expect(service.send(payload)).rejects.toThrow(
        'Failed to get a valid and structured response from the LLM.',
      );
    });

    it('should throw a ZodError for an invalid response structure', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{"invalid": "structure"}',
        },
      });

      const payload = createStringPayload();
      await expect(service.send(payload)).rejects.toThrow(ZodError);
    });

    it('should throw an error if JsonParserUtil fails to parse the response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'This is not JSON.',
        },
      });

      (jsonParserUtil.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Malformed or irreparable JSON string provided.');
      });

      const payload = createStringPayload();
      await expect(service.send(payload)).rejects.toThrow(
        'Failed to get a valid and structured response from the LLM.',
      );
    });

    it('should not retry on non-429 errors', async () => {
      const serverError = new GoogleGenerativeAIFetchError('Server error', 500);
      mockGenerateContent.mockRejectedValue(serverError);

      const payload = createStringPayload();
      await expect(service.send(payload)).rejects.toThrow(
        'Failed to get a valid and structured response from the LLM',
      );

      // Should only be called once, no retries
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic', () => {
    // Helper function to test retry behavior
    const testRetryBehaviorSuccess = async (
      errors: Error[],
      expectedCallCount: number,
    ): Promise<void> => {
      const payload = createStringPayload();

      // Chain the mock rejections followed by success
      let mockChain = mockGenerateContent;
      errors.forEach((error) => {
        mockChain = mockChain.mockRejectedValueOnce(error);
      });
      mockChain.mockResolvedValueOnce(createValidResponse(2));

      const result = await service.send(payload);
      expectValidResponse(result, 2);
      expect(mockGenerateContent).toHaveBeenCalledTimes(expectedCallCount);
    };

    const testRetryBehaviorFailure = async (
      errors: Error[],
      expectedCallCount: number,
    ): Promise<void> => {
      const payload = createStringPayload();

      // Mock all calls to fail
      errors.forEach((error) => {
        mockGenerateContent.mockRejectedValueOnce(error);
      });

      await expect(service.send(payload)).rejects.toThrow();
      expect(mockGenerateContent).toHaveBeenCalledTimes(expectedCallCount);
    };

    // eslint-disable-next-line jest/expect-expect
    it('should retry on 429 errors and eventually succeed', async () => {
      await testRetryBehaviorSuccess(
        [new GoogleGenerativeAIFetchError('Rate limited', 429)],
        2,
      );
    });

    // eslint-disable-next-line jest/expect-expect
    it('should retry multiple times with exponential backoff', async () => {
      await testRetryBehaviorSuccess(
        [
          new GoogleGenerativeAIFetchError('Rate limited', 429),
          new GoogleGenerativeAIFetchError('Rate limited', 429),
        ],
        3,
      );
    });

    // eslint-disable-next-line jest/expect-expect
    it('should retry on rate limit error messages', async () => {
      await testRetryBehaviorSuccess([new Error('Rate limit exceeded')], 2);
    });

    // eslint-disable-next-line jest/expect-expect
    it('should retry on "too many requests" error messages', async () => {
      await testRetryBehaviorSuccess([new Error('Too many requests')], 2);
    });

    // eslint-disable-next-line jest/expect-expect
    it('should throw error after max retries exceeded', async () => {
      const rateLimitError = new GoogleGenerativeAIFetchError(
        'Rate limited',
        429,
      );
      await testRetryBehaviorFailure(
        [rateLimitError, rateLimitError, rateLimitError],
        3,
      );
    });
  });

  describe('resource exhausted error handling', () => {
    // Helper function to test resource exhausted error patterns
    const testResourceExhaustedError = async (
      errorMessage: string,
      statusCode: number = 429,
    ): Promise<void> => {
      const payload = createStringPayload();

      const error = errorMessage.includes('RESOURCE_EXHAUSTED')
        ? new GoogleGenerativeAIFetchError(errorMessage, statusCode)
        : new Error(errorMessage);

      if (!(error instanceof GoogleGenerativeAIFetchError)) {
        (error as Error & { status?: number }).status = statusCode;
      }

      mockGenerateContent.mockRejectedValueOnce(error);

      await expect(service.send(payload)).rejects.toThrow(
        ResourceExhaustedError,
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Should not retry
    };

    // eslint-disable-next-line jest/expect-expect
    it('should throw ResourceExhaustedError for "RESOURCE_EXHAUSTED" error', async () => {
      await testResourceExhaustedError('RESOURCE_EXHAUSTED: Quota exceeded');
    });

    // eslint-disable-next-line jest/expect-expect
    it('should throw ResourceExhaustedError for "resource exhausted" error', async () => {
      await testResourceExhaustedError(
        'Request failed: resource exhausted - quota limits exceeded',
      );
    });

    // eslint-disable-next-line jest/expect-expect
    it('should throw ResourceExhaustedError for "quota exceeded" error', async () => {
      await testResourceExhaustedError('API quota exceeded for this project');
    });

    // eslint-disable-next-line jest/expect-expect
    it('should throw ResourceExhaustedError for "quota exhausted" error', async () => {
      await testResourceExhaustedError('Your quota has been exhausted');
    });

    it('should preserve original error in ResourceExhaustedError', async () => {
      const payload = createStringPayload();
      const originalError = new GoogleGenerativeAIFetchError(
        'RESOURCE_EXHAUSTED: Free tier quota exceeded',
        429,
      );

      mockGenerateContent.mockRejectedValueOnce(originalError);

      const thrownError = await service.send(payload).catch((error) => error);

      expect(thrownError).toBeInstanceOf(ResourceExhaustedError);
      expect((thrownError as ResourceExhaustedError).originalError).toBe(
        originalError,
      );
    });

    it('should still retry regular rate limit errors (not resource exhausted)', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(
          new GoogleGenerativeAIFetchError('Rate limit exceeded', 429),
        )
        .mockResolvedValueOnce(createValidResponse(1));

      const payload = createStringPayload();
      const result = await service.send(payload);

      expectValidResponse(result, 1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2); // Should retry
    });
  });
});
