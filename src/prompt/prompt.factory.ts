/**
 * Factory class responsible for creating instances of different types of prompts
 * based on the provided task type and input data.
 *
 * @class PromptFactory
 * @method create
 * @param {CreateAssessorDto} dto - Data Transfer Object containing the task type and input data
 * for creating a prompt.
 * @returns {Prompt} - An instance of a specific prompt type (TextPrompt, TablePrompt, or ImagePrompt)
 * based on the task type provided in the DTO.
 * @throws {Error} - Throws an error if the task type is unsupported.
 *
 * The factory supports the following task types:
 * - `TaskType.TEXT`: Creates a `TextPrompt` instance.
 * - `TaskType.TABLE`: Creates a `TablePrompt` instance.
 * - `TaskType.IMAGE`: Creates an `ImagePrompt` instance, converting buffer inputs to strings if necessary.
 */
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
  public async create(dto: CreateAssessorDto): Promise<Prompt> {
    const inputs = {
      referenceTask: dto.reference,
      studentTask: dto.studentResponse,
      emptyTask: dto.template,
    };

    let prompt: Prompt;
    switch (dto.taskType) {
      case TaskType.TEXT:
        prompt = new TextPrompt(inputs);
        break;
      case TaskType.TABLE:
        prompt = new TablePrompt(inputs);
        break;
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
        prompt = new ImagePrompt(imageInputs, dto.images);
        break;
      }
      default:
        throw new Error(
          `Unsupported task type: ${String((dto as Record<string, unknown>).taskType)}`,
        );
    }
    await prompt.initSystemPrompt();
    return prompt;
  }
}
