import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodError } from 'zod';

import { GeminiService } from './gemini.service';
import {
  ImagePromptPayload,
  SystemPromptPayload,
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

    await service.send('test prompt');

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash-lite',
    });
    expect(mockGenerateContent).toHaveBeenCalledWith('test prompt');
  });

  it('should send a system prompt payload and return a valid response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 2, "reasoning": "Test"}, "accuracy": {"score": 2, "reasoning": "Test"}, "spag": {"score": 2, "reasoning": "Test"}}',
      },
    });

    const payload: SystemPromptPayload = {
      system: 'System instruction',
      user: 'User message',
    };

    await service.send(payload);

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: 'System instruction',
    });
    expect(mockGenerateContent).toHaveBeenCalledWith('User message');
  });

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

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
    });
    expect(mockGenerateContent).toHaveBeenCalledWith([
      { text: 'Test message' },
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

    await service.send('test');

    expect(jsonParserUtil.parse).toHaveBeenCalledWith(malformedJson);
  });

  it('should throw an error if the SDK fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('SDK Error'));

    await expect(service.send('test')).rejects.toThrow(
      'Failed to get a valid and structured response from the LLM.',
    );
  });

  it('should throw a ZodError for an invalid response structure', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '{"invalid": "structure"}',
      },
    });

    await expect(service.send('test')).rejects.toThrow(ZodError);
  });
});
