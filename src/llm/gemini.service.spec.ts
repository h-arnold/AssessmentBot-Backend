// Mock the @google/generative-ai library
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

const mockGoogleGenerativeAI = jest
  .fn()
  .mockImplementation((apiKey: string) => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI,
}));

import path from 'path';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodError } from 'zod';

import { GeminiService } from './gemini.service';
import { LLMService } from './llm.service.interface';
import { JsonParserUtil } from '../common/json-parser.util';
import { ConfigService } from '../config/config.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const textTask = require(path.join(process.cwd(), 'test/data/textTask.json'));

describe('GeminiService', () => {
  let service: GeminiService;
  let configService: ConfigService;
  let jsonParserUtil: JsonParserUtil;

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_KEYS = 'test-api-key';
    process.env.MAX_IMAGE_UPLOAD_SIZE_MB = '5';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: 'LLMService', useClass: GeminiService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
        {
          provide: JsonParserUtil,
          useValue: {
            parse: jest.fn((jsonString: string) => {
              return JSON.parse(jsonString);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    configService = module.get<ConfigService>(ConfigService);
    jsonParserUtil = module.get<JsonParserUtil>(JsonParserUtil);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialise the SDK correctly', () => {
    const service = new GeminiService(configService, jsonParserUtil);
    expect(mockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
  });

  it('should send a text payload and return a valid, structured response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 5, "reasoning": "Perfect"}, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}',
      },
    });

    const response = await service.send(textTask.studentTask);

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash-lite',
    });
    expect(response).toEqual({
      completeness: { score: 5, reasoning: 'Perfect' },
      accuracy: { score: 4, reasoning: 'Good' },
      spag: { score: 3, reasoning: 'Okay' },
    });
  });

  it('should send a multimodal payload and return a valid, structured response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 5, "reasoning": "Perfect"}, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}',
      },
    });

    const payload = {
      messages: [{ content: 'test message' }],
      images: [{ mimeType: 'image/png', data: 'test-data' }],
    };

    const response = await service.send(payload);

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
    });
    expect(response).toEqual({
      completeness: { score: 5, reasoning: 'Perfect' },
      accuracy: { score: 4, reasoning: 'Good' },
      spag: { score: 3, reasoning: 'Okay' },
    });
  });

  it('should handle malformed JSON and still return a valid response', async () => {
    const malformedJson =
      '{"completeness": {"score": 5, "reasoning": "Perfect"},, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}';
    const validJson =
      '{"completeness": {"score": 5, "reasoning": "Perfect"}, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}';

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => malformedJson,
      },
    });

    // Mock jsonParserUtil.parse to simulate jsonrepair fixing the malformed JSON
    const mockJsonParserUtilParse = jsonParserUtil.parse as jest.Mock;
    mockJsonParserUtilParse.mockReturnValueOnce(JSON.parse(validJson));

    const response = await service.send('test prompt');

    expect(mockJsonParserUtilParse).toHaveBeenCalledWith(malformedJson);
    expect(response).toEqual({
      completeness: { score: 5, reasoning: 'Perfect' },
      accuracy: { score: 4, reasoning: 'Good' },
      spag: { score: 3, reasoning: 'Okay' },
    });
  });

  it('should throw an error if the SDK fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('SDK Error'));

    await expect(service.send('test prompt')).rejects.toThrow(
      'Failed to get a valid and structured response from the LLM.',
    );
  });

  it('should throw a ZodError for an invalid response structure', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 99, "reasoning": "Invalid Score"}, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}',
      },
    });

    await expect(service.send('test prompt')).rejects.toThrow(ZodError);
  });

  it('should throw an error for missing criteria', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '{"completeness": {"score": 5, "reasoning": "Perfect"}}',
      },
    });

    await expect(service.send('test prompt')).rejects.toThrow(ZodError);
  });
});
