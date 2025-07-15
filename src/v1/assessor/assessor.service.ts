import { Injectable } from '@nestjs/common';

import { CreateAssessorDto } from './dto/create-assessor.dto';
import { LLMService } from '../../llm/llm.service.interface';
import { LlmResponse } from '../../llm/types';
import { PromptFactory } from '../../prompt/prompt.factory';

@Injectable()
export class AssessorService {
  /**
   * Constructs an instance of AssessorService.
   *
   * @param llmService - The service responsible for interacting with the LLM (Large Language Model).
   * @param promptFactory - The factory responsible for generating prompts for the LLM.
   */
  constructor(
    private readonly llmService: LLMService,
    private readonly promptFactory: PromptFactory,
  ) {}

  /**
   * Creates an assessment based on the provided data transfer object (DTO).
   * This method generates a prompt using the `promptFactory`, builds a message,
   * and sends it to the LLM service for processing.
   *
   * @param dto - The data transfer object containing the details required to create an assessment.
   * @returns A promise that resolves to an `LlmResponse` containing the result of the assessment.
   */
  async createAssessment(dto: CreateAssessorDto): Promise<LlmResponse> {
    const prompt = this.promptFactory.create(dto);
    const message = await prompt.buildMessage();
    return this.llmService.send(message);
  }
}
