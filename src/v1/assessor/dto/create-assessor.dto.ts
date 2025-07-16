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
export const createAssessorDtoSchema = z
  .discriminatedUnion('taskType', [
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
        // Removed the `systemPromptFile` property from the schema as it is unused and determined by the factory.
        systemPromptFile: z.string().optional(),
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
        systemPromptFile: z.string().optional(),
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
         * @example "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
         */
        studentResponse: z.union([z.string().min(1), z.instanceof(Buffer)]),
        /**
         * An array of image objects, each with a path and mimeType.
         * This field is used to provide additional image data related to the IMAGE taskType.
         * Each object in the array represents an image with its file path and MIME type.
         * @example [
         *   { path: "/images/image1.png", mimeType: "image/png" },
         *   { path: "/images/image2.jpg", mimeType: "image/jpeg" }
         * ]
         */
        images: z
          .array(z.object({ path: z.string(), mimeType: z.string() }))
          .optional(),
        systemPromptFile: z.string().optional(),
      })
      .strict(),
  ])
  .superRefine((data, ctx) => {
    if (data.taskType === TaskType.IMAGE) {
      const allStrings =
        typeof data.reference === 'string' &&
        typeof data.template === 'string' &&
        typeof data.studentResponse === 'string';
      const allBuffers =
        data.reference instanceof Buffer &&
        data.template instanceof Buffer &&
        data.studentResponse instanceof Buffer;

      if (!allStrings && !allBuffers) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'For IMAGE taskType, reference, template, and studentResponse must all be of the same type (either all strings or all Buffers).',
        });
      }
    }
  });

/**
 * Represents the Data Transfer Object (DTO) for creating an assessment.
 * This type is inferred from `createAssessorDtoSchema`.
 */
export type CreateAssessorDto = z.infer<typeof createAssessorDtoSchema>;
