import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { ZodError } from 'zod';

import { GeminiService } from './gemini.service';
import {
  ImagePromptPayload,
  StringPromptPayload,
} from './llm.service.interface';
import { JsonParserUtil } from '../common/json-parser.util';
import { ConfigService } from '../config/config.service';

jest.mock('@google/generative-ai');

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
        return null;
      }),
    } as unknown as ConfigService;

    // Mock JsonParserUtil
    jsonParserUtil = {
      parse: jest.fn((json: string) => JSON.parse(json)),
    } as unknown as JsonParserUtil;

    logger = new Logger();

    service = new GeminiService(configService, jsonParserUtil, logger);
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
      messages: [{ content: 'Test message' }],
      images: [{ mimeType: 'image/png', data: 'test-data' }],
    };

    await service.send(payload);

    // PNG files should be read with base64 encoding
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
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
});
