import { z } from 'zod';

import { imageTaskDtoSchema, type ImageTaskDto } from './image-task.dto';
import {
  textTableTaskDtoSchema,
  type TextTableTaskDto,
} from './text-table-task.dto';

/**
 * Defines the possible types of assessment tasks.
 * @deprecated Use TextTableTaskType for text/table tasks or 'IMAGE' literal for image tasks
 */
export enum TaskType {
  TEXT = 'TEXT',
  TABLE = 'TABLE',
  IMAGE = 'IMAGE',
}

/**
 * Zod schema for validating the CreateAssessorDto.
 * Now uses a union of the separate text/table and image task schemas.
 */
export const createAssessorDtoSchema = z.union([
  textTableTaskDtoSchema,
  imageTaskDtoSchema,
]);

/**
 * Represents the Data Transfer Object (DTO) for creating an assessment.
 * This type is now a union of TextTableTaskDto and ImageTaskDto.
 */
export type CreateAssessorDto = TextTableTaskDto | ImageTaskDto;
