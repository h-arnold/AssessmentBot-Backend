import { Injectable } from '@nestjs/common';

import { ImagePrompt } from './image.prompt';
import { Prompt } from './prompt.base';
import { TablePrompt } from './table.prompt';
import { TextPrompt } from './text.prompt';
import {
  CreateAssessorDto,
  TaskType,
} from '../v1/assessor/dto/create-assessor.dto';

@Injectable()
export class PromptFactory {
  public create(dto: CreateAssessorDto): Prompt {
    const inputs = {
      referenceTask: dto.reference,
      studentTask: dto.studentResponse,
      emptyTask: dto.template,
    };

    switch (dto.taskType) {
      case TaskType.TEXT:
        return new TextPrompt(inputs);
      case TaskType.TABLE:
        return new TablePrompt(inputs);
      case TaskType.IMAGE: {
        const imageInputs = {
          referenceTask: Buffer.isBuffer(dto.reference)
            ? dto.reference.toString()
            : dto.reference,
          studentTask: Buffer.isBuffer(dto.studentResponse)
            ? dto.studentResponse.toString()
            : dto.studentResponse,
          emptyTask: Buffer.isBuffer(dto.template)
            ? dto.template.toString()
            : dto.template,
        };
        return new ImagePrompt(imageInputs, dto.images);
      }
      default:
        throw new Error(`Unsupported task type: ${String((dto as Record<string, unknown>).taskType)}`);
    }
  }
}
