import { Injectable } from '@nestjs/common';

import { CreateAssessorDto } from './dto/create-assessor.dto';
import { LLMService } from '../../llm/llm.service.interface';
import { LlmResponse } from '../../llm/types';
import { PromptFactory } from '../../prompt/prompt.factory';

function isMultimodalPayload(
  msg: unknown
): msg is { messages: { content: string }[]; images: { mimeType: string; data: string }[] } {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'messages' in msg &&
    'images' in msg
  );
}

@Injectable()
export class AssessorService {
  constructor(
    private readonly llmService: LLMService,
    private readonly promptFactory: PromptFactory,
  ) {}

  async createAssessment(dto: CreateAssessorDto): Promise<LlmResponse> {
    const prompt = this.promptFactory.create(dto);
    const message = await prompt.buildMessage();
    if (dto.taskType === 'IMAGE' && isMultimodalPayload(message)) {
      return this.llmService.send(message);
    }
    return this.llmService.send(message as string);
  }
}
