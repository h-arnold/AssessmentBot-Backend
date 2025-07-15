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

    // Determine and load prompt files
    const { systemPromptFile, userTemplateFile } = this.getPromptFiles(
      dto.taskType,
    );
    const systemPrompt = await this.loadSystemPrompt(systemPromptFile);

    // Instantiate the appropriate Prompt subclass
    return this.instantiatePrompt(dto, inputs, userTemplateFile, systemPrompt);
  }

  // Determine prompt file names based on task type
  private getPromptFiles(taskType: TaskType): {
    systemPromptFile?: string;
    userTemplateFile?: string;
  } {
    switch (taskType) {
      case TaskType.TEXT:
        return {
          systemPromptFile: 'text.system.prompt.md',
          userTemplateFile: 'text.user.prompt.md',
        };
      case TaskType.TABLE:
        return {
          systemPromptFile: 'table.system.prompt.md',
          userTemplateFile: 'table.user.prompt.md',
        };
      case TaskType.IMAGE:
        return {
          systemPromptFile: 'image.system.prompt.md',
          userTemplateFile: undefined,
        };
      default:
        throw new Error(`Unsupported task type: ${String(taskType)}`);
    }
  }

  // Load system prompt content from markdown file, if provided
  private async loadSystemPrompt(
    systemPromptFile?: string,
  ): Promise<string | undefined> {
    if (systemPromptFile) {
      return await readMarkdown(systemPromptFile);
    }
    return undefined;
  }

  // Instantiate the correct Prompt subclass
  private instantiatePrompt(
    dto: CreateAssessorDto,
    inputs: unknown,
    userTemplateFile?: string,
    systemPrompt?: string,
  ): Prompt {
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
        throw new Error('Unsupported task type');
    }
  }
}
