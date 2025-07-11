import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodError } from 'zod';

import { GeminiService } from './gemini.service';
import { LLMService } from './llm.service.interface';

// Mock the @google/genai library
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));
const { GoogleGenerativeAI } = jest.requireActual('@google/genai');

jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe('GeminiService', () => {
  let service: GeminiService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: 'LLMService', useClass: GeminiService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialise the SDK correctly', () => {
    jest.spyOn(configService, 'get').mockReturnValue('test-api-key');
    const service = new GeminiService(configService);
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
  });

  it('should send a text payload and return a valid, structured response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 5, "reasoning": "Perfect"}, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}',
      },
    });

    const response = await service.send('test prompt');

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
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '{"completeness": {"score": 5, "reasoning": "Perfect"},, "accuracy": {"score": 4, "reasoning": "Good"}, "spag": {"score": 3, "reasoning": "Okay"}}',
      },
    });

    const response = await service.send('test prompt');

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
          '{"completeness": {"score": 99, "reasoning": "Invalid Score"}}',
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
