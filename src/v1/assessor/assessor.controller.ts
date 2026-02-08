import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { AssessorCacheInterceptor } from 'src/common/cache/assessor-cache.interceptor';
import { authenticatedThrottler } from 'src/config/throttler.config';

import { AssessorService } from './assessor.service';
import { type CreateAssessorDto } from './dto/create-assessor.dto';
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
 * - The `AssessorCacheInterceptor` validates request bodies against the Zod schema.
 * - For tasks of type `IMAGE`, it also uses the `ImageValidationPipe` to perform asynchronous validation
 *   on the image data itself.
 *
 * @see AppModule - Where the global `ThrottlerGuard` is configured.
 * @see config/throttler.config.ts - Where the `authenticatedThrottler` configuration is defined.
 * @see auth/api-key.guard.ts - The guard that protects this controller.
 */
@Controller('v1/assessor')
@UseGuards(ApiKeyGuard)
@Throttle(authenticatedThrottler)
@UseInterceptors(AssessorCacheInterceptor)
export class AssessorController {
  constructor(private readonly assessorService: AssessorService) {}

  /**
   * Creates a new assessment by processing the provided task data.
   *
   * This endpoint serves as the primary entry point for assessment requests.
   * It performs comprehensive validation, including schema validation via Zod
   * and specialised image validation for IMAGE task types, through the
   * `AssessorCacheInterceptor`. The method then
   * delegates to the AssessorService to orchestrate the assessment process.
   *
   * @param createAssessorDto - Validated data transfer object containing task details
   * @returns Promise resolving to LLM assessment response with scoring and reasoning
   * @throws {BadRequestException} If validation fails for any field
   * @throws {UnauthorizedException} If API key authentication fails
   */
  @Post()
  async create(
    @Body() createAssessorDto: CreateAssessorDto,
  ): Promise<LlmResponse> {
    return this.assessorService.createAssessment(createAssessorDto);
  }
}
