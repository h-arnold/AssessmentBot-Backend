import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { ZodValidationPipe } from 'src/common/zod-validation.pipe';

import { AssessorService } from './assessor.service';
import {
  CreateAssessorDto,
  createAssessorDtoSchema,
} from './dto/create-assessor.dto';

@Controller('v1/assessor')
@UseGuards(ApiKeyGuard)
export class AssessorController {
  constructor(private readonly assessorService: AssessorService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createAssessorDtoSchema))
    createAssessorDto: CreateAssessorDto,
  ) {
    return this.assessorService.createAssessment(createAssessorDto);
  }
}
