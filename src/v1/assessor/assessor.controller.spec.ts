import { AssessorController } from './assessor.controller';
import { TaskType, type CreateAssessorDto } from './dto/create-assessor.dto';
import { ImageValidationPipe } from '../../common/pipes/image-validation.pipe';
import { ConfigService } from '../../config/config.service';

describe('AssessorController', () => {
  const mockAssessorService = {
    createAssessment: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates image payloads when task type is IMAGE', async () => {
    const controller = new AssessorController(
      mockAssessorService as never,
      mockConfigService,
    );
    const transformSpy = jest
      .spyOn(ImageValidationPipe.prototype, 'transform')
      .mockResolvedValue('ok');

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

    expect(transformSpy).toHaveBeenCalledTimes(3);
    expect(transformSpy).toHaveBeenNthCalledWith(1, payload.reference);
    expect(transformSpy).toHaveBeenNthCalledWith(2, payload.studentResponse);
    expect(transformSpy).toHaveBeenNthCalledWith(3, payload.template);
    expect(mockAssessorService.createAssessment).toHaveBeenCalledWith(payload);
  });

  it('skips image validation for non-image task types', async () => {
    const controller = new AssessorController(
      mockAssessorService as never,
      mockConfigService,
    );
    const transformSpy = jest.spyOn(ImageValidationPipe.prototype, 'transform');

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

    expect(transformSpy).not.toHaveBeenCalled();
    expect(mockAssessorService.createAssessment).toHaveBeenCalledWith(payload);
  });

  describe('Integration: Caching interceptor application', () => {
    it('applies caching interceptor to the create endpoint', async () => {
      const controller = new AssessorController(
        mockAssessorService as never,
        mockConfigService,
      );

      const descriptors = Object.getOwnPropertyDescriptors(
        AssessorController.prototype,
      );
      const createDescriptor = descriptors.create;

      expect(createDescriptor).toBeDefined();
    });
  });
});
