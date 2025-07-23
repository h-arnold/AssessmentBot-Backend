import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { ImageValidationPipe } from 'src/common/pipes/image-validation.pipe';
import { ZodValidationPipe } from 'src/common/zod-validation.pipe';
import { ConfigService } from 'src/config/config.service';

import { AssessorService } from './assessor.service';
import {
  type CreateAssessorDto,
  createAssessorDtoSchema,
} from './dto/create-assessor.dto';
import { LlmResponse } from '../../llm/types';

/**
 * Controller for handling assessor-related API requests.
 */

/**
 * Controller responsible for handling assessor-related operations.
 *
 * @remarks
 * This controller is part of the v1 API and is protected by the `ApiKeyGuard`.
 * It provides endpoints for creating assessments and validating input data.
 *
 * @constructor
 * @param assessorService - Service responsible for assessment-related business logic.
 * @param configService - Service for accessing application configuration settings.
 *
 * @method create
 * Handles the creation of a new assessment.
 *
 * @param createAssessorDto - The data transfer object containing assessment details.
 * @returns A promise that resolves to the result of the assessment creation.
 *
 * @remarks
 * If the `taskType` is `IMAGE`, additional validation is performed on image-related fields
 * (`reference`, `template`, and `studentResponse`) using the `ImageValidationPipe`.
 */
@Controller('v1/assessor')
@UseGuards(ApiKeyGuard, ThrottlerGuard)
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
