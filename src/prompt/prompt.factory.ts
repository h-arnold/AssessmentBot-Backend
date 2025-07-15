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
// ...existing code...

import { Injectable } from '@nestjs/common';

import { ImagePrompt } from './image.prompt';
import { Prompt } from './prompt.base';
import { TablePrompt } from './table.prompt';
import { TextPrompt } from './text.prompt';
import { readMarkdown } from '../common/file-utils';
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

    // Determine system prompt and user template file names based on task type
    let systemPromptFile: string | undefined;
    let userTemplateFile: string | undefined;
    switch (dto.taskType) {
      case TaskType.TEXT:
        systemPromptFile = 'text.system.prompt.md';
        userTemplateFile = 'text.user.prompt.md';
        break;
      case TaskType.TABLE:
        systemPromptFile = 'table.system.prompt.md';
        userTemplateFile = 'table.user.prompt.md';
        break;
      case TaskType.IMAGE:
        systemPromptFile = 'image.system.prompt.md';
        userTemplateFile = undefined;
        break;
      default:
        throw new Error(
          `Unsupported task type: ${String((dto as Record<string, unknown>).taskType)}`,
        );
    }

    // Fetch the system prompt content
    let systemPrompt: string | undefined = undefined;
    if (systemPromptFile) {
      systemPrompt = await readMarkdown(systemPromptFile);
    }

    // Instantiate the correct Prompt subclass
    switch (dto.taskType) {
      case TaskType.TEXT:
        return new TextPrompt(inputs, userTemplateFile, systemPrompt);
      case TaskType.TABLE:
        return new TablePrompt(inputs, userTemplateFile, systemPrompt);
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
        return new ImagePrompt(imageInputs, dto.images, systemPrompt);
      }
      default:
        throw new Error(
          `Unsupported task type: ${String((dto as Record<string, unknown>).taskType)}`,
        );
    }
  }
}
