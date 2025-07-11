import { Test, TestingModule } from '@nestjs/testing';

import { AssessorService } from './assessor.service';
import { CreateAssessorDto, TaskType } from './dto/create-assessor.dto';
import { ConfigModule } from '../../config/config.module';
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
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LlmModule, PromptModule, ConfigModule],
      providers: [AssessorService],
    })
      .overrideProvider('LLMService')
      .useValue({ send: jest.fn() })
      .overrideProvider(PromptFactory)
      .useValue({ create: jest.fn() })
      .overrideProvider(GeminiService)
      .useValue({ send: jest.fn() })
      .compile();

    service = module.get<AssessorService>(AssessorService);
    llmService = module.get<LLMService>('LLMService');
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
  });
});
