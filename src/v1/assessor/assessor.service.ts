import { Injectable } from '@nestjs/common';

import { CreateAssessorDto } from './dto/create-assessor.dto';
import { LLMService, LlmPayload } from '../../llm/llm.service.interface';
import { LlmResponse } from '../../llm/types';
import { PromptFactory } from '../../prompt/prompt.factory';

/**
 * Type guard function to determine if the given object matches the multimodal payload structure.
 *
 * A multimodal payload is expected to have:
 * - A `messages` property, which is an array of objects containing a `content` string.
 * - An `images` property, which is an array of objects containing a `mimeType` string and `data` string.
 *
 * @param msg - The object to be checked.
 * @returns `true` if the object matches the multimodal payload structure, otherwise `false`.
 */
function isMultimodalPayload(msg: unknown): msg is {
  messages: { content: string }[];
  images: { mimeType: string; data: string }[];
} {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'messages' in msg &&
    'images' in msg
  );
}

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
   *
   * @remarks
   * - If the `taskType` in the DTO is 'IMAGE' and the message is a multimodal payload,
   *   the message is sent directly as a multimodal payload.
   * - Otherwise, the message is sent as a string.
   */
  async createAssessment(dto: CreateAssessorDto): Promise<LlmResponse> {
    const prompt = await this.promptFactory.create(dto);
    const message = await prompt.buildMessage();
    if (dto.taskType === 'IMAGE' && isMultimodalPayload(message)) {
      return this.llmService.send(message);
    }
    return this.llmService.send(message as LlmPayload);
  }
}
