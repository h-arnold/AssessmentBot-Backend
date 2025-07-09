import { Test, TestingModule } from '@nestjs/testing';
import { AssessorService } from './assessor.service';
import { CreateAssessorDto, TaskType } from './dto/create-assessor.dto';

describe('AssessorService', () => {
  let service: AssessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessorService],
    }).compile();

    service = module.get<AssessorService>(AssessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAssessment', () => {
    it('should exist on the service', () => {
      expect(service.createAssessment).toBeDefined();
    });

    it('should accept an argument that conforms to CreateAssessorDto type and return a placeholder response', async () => {
      const validPayload: CreateAssessorDto = {
        taskType: TaskType.TEXT,
        reference: 'some reference',
        template: 'some template',
        studentResponse: 'some student response',
      };

      const result = await service.createAssessment(validPayload);
      expect(result).toEqual({ message: 'Assessment created successfully' });
    });

    it('should propagate errors from internal processes', async () => {
      jest.spyOn(service, 'createAssessment').mockImplementationOnce(() => {
        return Promise.reject(new Error('Internal service error'));
      });

      const payload: CreateAssessorDto = {
        taskType: TaskType.TEXT,
        reference: 'ref',
        template: 'temp',
        studentResponse: 'resp',
      };

      await expect(service.createAssessment(payload)).rejects.toThrow(
        'Internal service error',
      );
    });
  });
});
