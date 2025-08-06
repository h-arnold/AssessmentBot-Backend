import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
   * Creates a new assessment by processing the provided task data.
   *
   * This endpoint serves as the primary entry point for assessment requests.
   * It performs comprehensive validation including schema validation via Zod
   * and specialized image validation for IMAGE task types. The method then
   * delegates to the AssessorService to orchestrate the assessment process.
   *
   * **Image Task Validation:**
   * For IMAGE task types, this method performs additional validation on the
   * image data using the ImageValidationPipe to ensure proper format, size,
   * and MIME type compliance.
   *
   * @param createAssessorDto - Validated data transfer object containing task details
   * @returns Promise resolving to LLM assessment response with scoring and reasoning
   * @throws {BadRequestException} If validation fails for any field
   * @throws {UnauthorizedException} If API key authentication fails
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
