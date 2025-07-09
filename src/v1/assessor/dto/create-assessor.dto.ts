import { z } from 'zod';

// Define the TaskType enum
export enum TaskType {
  TEXT = 'TEXT',
  TABLE = 'TABLE',
  IMAGE = 'IMAGE',
}

// Define the Zod schema for the DTO
export const createAssessorDtoSchema = z.discriminatedUnion('taskType', [
  z
    .object({
      taskType: z.literal(TaskType.TEXT),
      reference: z.string().min(1),
      template: z.string().min(1),
      studentResponse: z.string().min(1),
    })
    .strict(),
  z
    .object({
      taskType: z.literal(TaskType.TABLE),
      reference: z.string().min(1),
      template: z.string().min(1),
      studentResponse: z.string().min(1),
    })
    .strict(),
  z
    .object({
      taskType: z.literal(TaskType.IMAGE),
      reference: z.union([z.string().min(1), z.instanceof(Buffer)]),
      template: z.union([z.string().min(1), z.instanceof(Buffer)]),
      studentResponse: z.union([z.string().min(1), z.instanceof(Buffer)]),
    })
    .strict(),
]);

// Create a TypeScript type from the Zod schema
export type CreateAssessorDto = z.infer<typeof createAssessorDtoSchema>;
