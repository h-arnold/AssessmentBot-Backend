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

/**
 * A factory for creating prompt instances based on the task type.
 */
@Injectable()
export class PromptFactory {
  /**
   * Creates a prompt instance based on the provided DTO.
   * @param dto The DTO containing the task type and other data.
   * @returns A prompt instance.
   * @throws An error if the task type is unsupported.
   */
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

  /**
   * Determines the prompt file names based on the task type.
   * @param taskType The task type.
   * @returns An object containing the system and user prompt file names.
   */
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

  /**
   * Loads the system prompt content from a markdown file.
   * @param systemPromptFile The name of the system prompt file.
   * @returns The content of the system prompt file, or undefined if the file name is not provided.
   */
  private async loadSystemPrompt(
    systemPromptFile?: string,
  ): Promise<string | undefined> {
    if (systemPromptFile) {
      return await readMarkdown(systemPromptFile);
    }
    return undefined;
  }

  /**
   * Instantiates the correct Prompt subclass.
   * @param dto The DTO.
   * @param inputs The prompt inputs.
   * @param userTemplateFile The name of the user template file.
   * @param systemPrompt The system prompt string.
   * @returns A prompt instance.
   */
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
