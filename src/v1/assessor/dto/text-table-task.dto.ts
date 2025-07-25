import { z } from 'zod';

/**
 * Defines the possible types of text-based assessment tasks.
 */
export enum TextTableTaskType {
  TEXT = 'TEXT',
  TABLE = 'TABLE',
}

/**
 * Zod schema for validating text and table assessment tasks.
 * These task types have identical structure with string-based fields only.
 */
export const textTableTaskDtoSchema = z
  .object({
    taskType: z.enum([TextTableTaskType.TEXT, TextTableTaskType.TABLE]),
    /**
     * The reference content for the task.
     * @example "The quick brown fox jumps over the lazy dog."
     */
    reference: z.string().min(1),
    /**
     * The template content for the task.
     * @example "Write a sentence about a fox."
     */
    template: z.string().min(1),
    /**
     * The student's response content.
     * @example "A fox is a mammal."
     */
    studentResponse: z.string().min(1),
  })
  .strict();

/**
 * Represents the Data Transfer Object (DTO) for text and table assessment tasks.
 * This type is inferred from `textTableTaskDtoSchema`.
 */
export type TextTableTaskDto = z.infer<typeof textTableTaskDtoSchema>;
