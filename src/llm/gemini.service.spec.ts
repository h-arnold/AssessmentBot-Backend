import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { ZodError } from 'zod';

import { GeminiService } from './gemini.service';
import {
  ImagePromptPayload,
  StringPromptPayload,
} from './llm.service.interface';
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

    logger = new Logger();

    service = new GeminiService(configService, jsonParserUtil);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialise the SDK correctly', () => {
    expect(mockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
  });

  it('should send a string payload and return a valid response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 1, "reasoning": "Test"}, "accuracy": {"score": 1, "reasoning": "Test"}, "spag": {"score": 1, "reasoning": "Test"}}',
      },
    });

    const payload: StringPromptPayload = {
      system: 'system prompt',
      user: 'test prompt',
    };
    await service.send(payload);

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: 'system prompt',
      generationConfig: { temperature: 0 },
    });
    expect(mockGenerateContent).toHaveBeenCalledWith(['test prompt']);
  });

  // Removed system prompt payload test as SystemPromptPayload is no longer supported

  it('should send a multimodal payload and return a valid response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 3, "reasoning": "Test"}, "accuracy": {"score": 3, "reasoning": "Test"}, "spag": {"score": 3, "reasoning": "Test"}}',
      },
    });

    const payload: ImagePromptPayload = {
      system: 'system prompt',
      messages: [{ content: 'Test message' }],
      images: [{ mimeType: 'image/png', data: 'test-data' }],
    };

    await service.send(payload);

    // PNG files should be read with base64 encoding
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      systemInstruction: 'system prompt',
      generationConfig: { temperature: 0 },
    });
    expect(mockGenerateContent).toHaveBeenCalledWith([
      'Test message',
      { inlineData: { mimeType: 'image/png', data: 'test-data' } },
    ]);
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

    const payload: StringPromptPayload = {
      system: 'system prompt',
      user: 'test',
    };
    await service.send(payload);

    expect(jsonParserUtil.parse).toHaveBeenCalledWith(malformedJson);
  });

  it('should throw an error if the SDK fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('SDK Error'));

    const payload: StringPromptPayload = {
      system: 'system prompt',
      user: 'test',
    };
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

    const payload: StringPromptPayload = {
      system: 'system prompt',
      user: 'test',
    };
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

    const payload: StringPromptPayload = {
      system: 'system prompt',
      user: 'test',
    };
    await expect(service.send(payload)).rejects.toThrow(
      'Failed to get a valid and structured response from the LLM.',
    );
  });

  describe('retry logic', () => {
    it('should retry on 429 errors and eventually succeed', async () => {
      // Don't use fake timers for this test since it's hard to coordinate
      // with the actual retry mechanism
      const payload: StringPromptPayload = {
        system: 'system prompt',
        user: 'test',
      };

      // First call fails with 429, second call succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('Rate limited', 429))
        .mockResolvedValueOnce({
          response: {
            text: () =>
              '{"completeness": {"score": 1, "reasoning": "Test"}, "accuracy": {"score": 1, "reasoning": "Test"}, "spag": {"score": 1, "reasoning": "Test"}}',
          },
        });

      const result = await service.send(payload);

      expect(result).toEqual({
        completeness: { score: 1, reasoning: 'Test' },
        accuracy: { score: 1, reasoning: 'Test' },
        spag: { score: 1, reasoning: 'Test' },
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times with exponential backoff', async () => {
      const payload: StringPromptPayload = {
        system: 'system prompt',
        user: 'test',
      };

      // First two calls fail with 429, third call succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('Rate limited', 429))
        .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('Rate limited', 429))
        .mockResolvedValueOnce({
          response: {
            text: () =>
              '{"completeness": {"score": 2, "reasoning": "Test"}, "accuracy": {"score": 2, "reasoning": "Test"}, "spag": {"score": 2, "reasoning": "Test"}}',
          },
        });

      const result = await service.send(payload);

      expect(result).toEqual({
        completeness: { score: 2, reasoning: 'Test' },
        accuracy: { score: 2, reasoning: 'Test' },
        spag: { score: 2, reasoning: 'Test' },
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exceeded', async () => {
      const payload: StringPromptPayload = {
        system: 'system prompt',
        user: 'test',
      };

      // All calls fail with 429 (more than max retries)
      const rateLimitError = new GoogleGenerativeAIFetchError('Rate limited', 429);
      mockGenerateContent.mockRejectedValue(rateLimitError);

      await expect(service.send(payload)).rejects.toThrow('Rate limited');

      // Should have called 3 times: initial + 2 retries (based on LLM_MAX_RETRIES=2)
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-429 errors', async () => {
      const payload: StringPromptPayload = {
        system: 'system prompt',
        user: 'test',
      };

      // Simulate a 500 error (not rate limiting)
      const serverError = new GoogleGenerativeAIFetchError('Server error', 500);
      mockGenerateContent.mockRejectedValue(serverError);

      await expect(service.send(payload)).rejects.toThrow('Failed to get a valid and structured response from the LLM');

      // Should only be called once, no retries
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should detect rate limit errors from error messages', async () => {
      const payload: StringPromptPayload = {
        system: 'system prompt',
        user: 'test',
      };

      // First call fails with rate limit message, second succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          response: {
            text: () =>
              '{"completeness": {"score": 3, "reasoning": "Test"}, "accuracy": {"score": 3, "reasoning": "Test"}, "spag": {"score": 3, "reasoning": "Test"}}',
          },
        });

      const result = await service.send(payload);

      expect(result).toEqual({
        completeness: { score: 3, reasoning: 'Test' },
        accuracy: { score: 3, reasoning: 'Test' },
        spag: { score: 3, reasoning: 'Test' },
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should detect rate limit errors from "too many requests" message', async () => {
      const payload: StringPromptPayload = {
        system: 'system prompt',
        user: 'test',
      };

      // First call fails with "too many requests", second succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Too many requests'))
        .mockResolvedValueOnce({
          response: {
            text: () =>
              '{"completeness": {"score": 4, "reasoning": "Test"}, "accuracy": {"score": 4, "reasoning": "Test"}, "spag": {"score": 4, "reasoning": "Test"}}',
          },
        });

      const result = await service.send(payload);

      expect(result).toEqual({
        completeness: { score: 4, reasoning: 'Test' },
        accuracy: { score: 4, reasoning: 'Test' },
        spag: { score: 4, reasoning: 'Test' },
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });
});
