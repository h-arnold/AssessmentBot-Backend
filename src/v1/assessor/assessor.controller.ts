import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { ImageValidationPipe } from 'src/common/pipes/image-validation.pipe';
import { ZodValidationPipe } from 'src/common/zod-validation.pipe';
import { ConfigService } from 'src/config/config.service';
import { AssessorService } from './assessor.service';
import {
  CreateAssessorDto,
  createAssessorDtoSchema,
} from './dto/create-assessor.dto';
import { LlmResponse } from '../../llm/types';

/**
 * Controller for handling assessor-related API requests.
 */

@Controller('v1/assessor')
@UseGuards(ApiKeyGuard)
export class AssessorController {
  constructor(
    private readonly assessorService: AssessorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handles the creation of a new assessment.
   * @param createAssessorDto The data transfer object containing assessment details.
   * @returns A promise that resolves to the result of the assessment creation.
   */
  @Post()
  async create(
    @Body(new ZodValidationPipe(createAssessorDtoSchema))
    createAssessorDto: CreateAssessorDto,
  ): Promise<LlmResponse> {
    // If taskType is IMAGE, validate image fields using ImageValidationPipe
    if (createAssessorDto.taskType === 'IMAGE') {
      const imagePipe = new ImageValidationPipe(this.configService);
      // Validate each image field
      await imagePipe.transform(createAssessorDto.reference);
      await imagePipe.transform(createAssessorDto.template);
      await imagePipe.transform(createAssessorDto.studentResponse);
    }
    return this.assessorService.createAssessment(createAssessorDto);
  }
}
