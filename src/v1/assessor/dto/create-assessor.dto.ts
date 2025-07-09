import { z } from 'zod';

/**
 * Defines the possible types of assessment tasks.
 */
export enum TaskType {
  TEXT = 'TEXT',
  TABLE = 'TABLE',
  IMAGE = 'IMAGE',
}

/**
 * Zod schema for validating the CreateAssessorDto.
 * Enforces strict type checking and validation rules for assessment creation requests.
 */
export const createAssessorDtoSchema = z.discriminatedUnion('taskType', [
  z
    .object({
      taskType: z.literal(TaskType.TEXT),
      /**
       * The reference text for TEXT taskType.
       * @example "The quick brown fox jumps over the lazy dog."
       */
      reference: z.string().min(1),
      /**
       * The template text for TEXT taskType.
       * @example "Write a sentence about a fox."
       */
      template: z.string().min(1),
      /**
       * The student's response text for TEXT taskType.
       * @example "A fox is a mammal."
       */
      studentResponse: z.string().min(1),
    })
    .strict(),
  z
    .object({
      taskType: z.literal(TaskType.TABLE),
      /**
       * The reference table data for TABLE taskType.
       * @example "Header1,Header2\nRow1Col1,Row1Col2"
       */
      reference: z.string().min(1),
      /**
       * The template for TABLE taskType.
       * @example "Create a table with two columns and two rows."
       */
      template: z.string().min(1),
      /**
       * The student's response table data for TABLE taskType.
       * @example "ColA,ColB\nData1,Data2"
       */
      studentResponse: z.string().min(1),
    })
    .strict(),
  z
    .object({
      taskType: z.literal(TaskType.IMAGE),
      /**
       * The reference image data for IMAGE taskType. Can be a base64 string or Buffer.
       * @example "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
       */
      reference: z.union([z.string().min(1), z.instanceof(Buffer)]),
      /**
       * The template for IMAGE taskType. Can be a base64 string or Buffer.
       * @example "Draw a red square."
       */
      template: z.union([z.string().min(1), z.instanceof(Buffer)]),
      /**
       * The student's response image data for IMAGE taskType. Can be a base64 string or Buffer.
       * @example "data:image/png;base64,iVBORw0KGgoAAAANSUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
       */
      studentResponse: z.union([z.string().min(1), z.instanceof(Buffer)]),
    })
    .strict(),
]);

/**
 * Represents the Data Transfer Object (DTO) for creating an assessment.
 * This type is inferred from `createAssessorDtoSchema`.
 */
export type CreateAssessorDto = z.infer<typeof createAssessorDtoSchema>;
