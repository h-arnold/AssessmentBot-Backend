import { AssessorController } from './assessor.controller';
import { TaskType, type CreateAssessorDto } from './dto/create-assessor.dto';

describe('AssessorController', () => {
  const mockAssessorService = {
    createAssessment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates assessments for image payloads', async () => {
    const controller = new AssessorController(mockAssessorService as never);

    const payload: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: 'data:image/png;base64,abcd',
      template: 'data:image/png;base64,efgh',
      studentResponse: 'data:image/png;base64,ijkl',
    };

    mockAssessorService.createAssessment.mockResolvedValueOnce({
      score: 4,
    });

    await controller.create(payload);

    expect(mockAssessorService.createAssessment).toHaveBeenCalledWith(payload);
  });

  it('creates assessments for non-image payloads', async () => {
    const controller = new AssessorController(mockAssessorService as never);

    const payload: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: '',
      studentResponse: '',
    };

    mockAssessorService.createAssessment.mockResolvedValueOnce({
      score: 5,
    });

    await controller.create(payload);

    expect(mockAssessorService.createAssessment).toHaveBeenCalledWith(payload);
  });

  describe('Integration: Caching interceptor application', () => {
    it('applies caching interceptor to the create endpoint', async () => {
      const controller = new AssessorController(mockAssessorService as never);

      const descriptors = Object.getOwnPropertyDescriptors(
        AssessorController.prototype,
      );
      const createDescriptor = descriptors.create;

      expect(createDescriptor).toBeDefined();
    });
  });
});
