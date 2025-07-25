import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { ImageValidationPipe } from 'src/common/pipes/image-validation.pipe';
import { ZodValidationPipe } from 'src/common/zod-validation.pipe';
import { ConfigService } from 'src/config/config.service';
import { authenticatedThrottler } from 'src/config/throttler.config';

import { AssessorService } from './assessor.service';
import {
  type CreateAssessorDto,
  createAssessorDtoSchema,
} from './dto/create-assessor.dto';
import { type ImageTaskDto, imageTaskDtoSchema } from './dto/image-task.dto';
import {
  type TextTableTaskDto,
  textTableTaskDtoSchema,
} from './dto/text-table-task.dto';
import { LlmResponse } from '../../llm/types';

/**
 * @class AssessorController
 * @description Controller responsible for handling all assessment-related API requests.
 *
 * @remarks
 * This controller is part of the v1 API. It is protected by the `ApiKeyGuard`, ensuring that only
 * authorised clients can access its endpoints. It provides a single endpoint for creating new assessments.
 *
 * **Rate-Limiting (Throttling):**
 * This controller demonstrates how to override the global rate-limiting settings for a specific set of routes.
 * - `@Throttle(authenticatedThrottler)`: This decorator is applied at the controller level, meaning all endpoints
 *   within this controller will use the specific rate-limiting rules defined in the `authenticatedThrottler` configuration.
 *   This is a crucial security and performance feature, allowing us to apply stricter limits to authenticated,
 *   resource-intensive operations compared to the global default for unauthenticated routes.
 *
 * **Input Validation:**
 * - The `create` method uses the `ZodValidationPipe` to validate the incoming request body against the `createAssessorDtoSchema`.
 * - For tasks of type `IMAGE`, it also programmatically uses the `ImageValidationPipe` to perform more complex,
 *   asynchronous validation on the image data itself.
 *
 * @see AppModule - Where the global `ThrottlerGuard` is configured.
 * @see config/throttler.config.ts - Where the `authenticatedThrottler` configuration is defined.
 * @see auth/api-key.guard.ts - The guard that protects this controller.
 */
@Controller('v1/assessor')
@UseGuards(ApiKeyGuard)
@Throttle(authenticatedThrottler)
export class AssessorController {
  constructor(
    private readonly assessorService: AssessorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handles the creation of a new assessment.
   * The method determines the task type and applies appropriate validation.
   * @param createAssessorDto The data transfer object containing assessment details.
   * @returns A promise that resolves to the result of the assessment creation.
   */
  @Post()
  async create(
    @Body(new ZodValidationPipe(createAssessorDtoSchema))
    createAssessorDto: CreateAssessorDto,
  ): Promise<LlmResponse> {
    // Apply additional validation for image tasks
    if (createAssessorDto.taskType === 'IMAGE') {
      await this.validateImageTask(createAssessorDto);
    }

    return this.assessorService.createAssessment(createAssessorDto);
  }

  /**
   * Validates image-specific fields using the ImageValidationPipe.
   * This method is called when the task type is IMAGE.
   * @param imageTaskDto The image task DTO to validate.
   */
  private async validateImageTask(imageTaskDto: ImageTaskDto): Promise<void> {
    const imagePipe = new ImageValidationPipe(this.configService);
    // Validate each image field
    await imagePipe.transform(imageTaskDto.reference);
    await imagePipe.transform(imageTaskDto.template);
    await imagePipe.transform(imageTaskDto.studentResponse);
  }
}
