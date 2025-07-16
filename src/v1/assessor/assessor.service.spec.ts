import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';

import { AssessorService } from './assessor.service';
import { CreateAssessorDto, TaskType } from './dto/create-assessor.dto';
import { JsonParserUtil } from '../../common/json-parser.util';
import { GeminiService } from '../../llm/gemini.service';
import { LlmModule } from '../../llm/llm.module';
import { LLMService } from '../../llm/llm.service.interface';
import { PromptFactory } from '../../prompt/prompt.factory';
import { PromptModule } from '../../prompt/prompt.module';

describe('AssessorService', () => {
  let service: AssessorService;
  let llmService: LLMService;
  let promptFactory: PromptFactory;

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_KEYS = 'test-api-key';
    process.env.MAX_IMAGE_UPLOAD_SIZE_MB = '5';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
    process.env.APP_NAME = 'AssessmentBot-Backend';
    process.env.APP_VERSION = 'test-version';
    process.env.LOG_LEVEL = 'debug';
  });
  beforeEach(async () => {
    const mockLlmService = { send: jest.fn() };
    const mockPromptFactory = { create: jest.fn() };
    const mockJsonParserUtil = { parse: jest.fn() };
    const mockConfigService = {
      get: jest.fn((key) => {
        return process.env[key] || '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LlmModule,
        PromptModule,
        ConfigModule,
        LoggerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            pinoHttp: {
              level: configService.get('LOG_LEVEL'),
            },
          }),
        }),
      ],
      providers: [
        AssessorService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideProvider(LLMService)
      .useValue(mockLlmService)
      .overrideProvider(PromptFactory)
      .useValue(mockPromptFactory)
      .overrideProvider(GeminiService)
      .useValue({ send: jest.fn() })
      .overrideProvider(JsonParserUtil)
      .useValue(mockJsonParserUtil)
      .compile();

    service = module.get<AssessorService>(AssessorService);
    llmService = module.get<LLMService>(LLMService);
    promptFactory = module.get<PromptFactory>(PromptFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAssessment', () => {
    it('should call the prompt factory and llm service', async () => {
      const dto: CreateAssessorDto = {
        taskType: TaskType.TEXT,
        reference: 'ref',
        studentResponse: 'stud',
        template: 'temp',
      };

      const mockPrompt = {
        buildMessage: jest.fn().mockResolvedValue('prompt message'),
      };
      (promptFactory.create as jest.Mock).mockReturnValue(mockPrompt);
      (llmService.send as jest.Mock).mockResolvedValue({ score: 5 });

      const result = await service.createAssessment(dto);

      expect(promptFactory.create).toHaveBeenCalledWith(dto);
      expect(mockPrompt.buildMessage).toHaveBeenCalled();
      expect(llmService.send).toHaveBeenCalledWith('prompt message');
      expect(result).toEqual({ score: 5 });
    });

    it('should correctly handle a multimodal (image) payload', async () => {
      const dto: CreateAssessorDto = {
        taskType: TaskType.IMAGE,
        reference: 'A picture of a cat',
        studentResponse: 'A drawing of a cat',
        template: 'An empty canvas',
        images: [
          {
            mimeType: 'image/png',
            base64: 'base64-encoded-string-1',
          },
          {
            mimeType: 'image/png',
            base64: 'base64-encoded-string-2',
          },
        ],
      };

      const mockMultimodalPayload = {
        system: 'You are an art critic.',
        user: [
          { type: 'text', text: 'Assess this artwork.' },
          {
            type: 'image',
            image: { mimeType: 'image/png', base64: 'base64-encoded-string-1' },
          },
          {
            type: 'image',
            image: { mimeType: 'image/png', base64: 'base64-encoded-string-2' },
          },
        ],
      };

      const mockPrompt = {
        buildMessage: jest.fn().mockResolvedValue(mockMultimodalPayload),
      };
      (promptFactory.create as jest.Mock).mockReturnValue(mockPrompt);
      (llmService.send as jest.Mock).mockResolvedValue({ score: 4 });

      const result = await service.createAssessment(dto);

      expect(promptFactory.create).toHaveBeenCalledWith(dto);
      expect(mockPrompt.buildMessage).toHaveBeenCalled();
      expect(llmService.send).toHaveBeenCalledWith(mockMultimodalPayload);
      expect(result).toEqual({ score: 4 });
    });
  });
});
