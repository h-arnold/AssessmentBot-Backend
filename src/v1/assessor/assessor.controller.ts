import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { ZodValidationPipe } from 'src/common/zod-validation.pipe';

import { AssessorService } from './assessor.service';
import {
  CreateAssessorDto,
  createAssessorDtoSchema,
} from './dto/create-assessor.dto';

/**
 * Controller for handling assessor-related API requests.
 */
@Controller('v1/assessor')
@UseGuards(ApiKeyGuard)
export class AssessorController {
  constructor(private readonly assessorService: AssessorService) {}

  /**
   * Handles the creation of a new assessment.
   * @param createAssessorDto The data transfer object containing assessment details.
   * @returns A promise that resolves to the result of the assessment creation.
   */
  @Post()
  async create(
    @Body(new ZodValidationPipe(createAssessorDtoSchema))
    createAssessorDto: CreateAssessorDto,
  ): Promise<{ message: string }> {
    return this.assessorService.createAssessment(createAssessorDto);
  }
}
