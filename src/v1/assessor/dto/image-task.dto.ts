import { z } from 'zod';

/**
 * Zod schema for validating image assessment tasks.
 * Image tasks have unique requirements for image data handling.
 */
export const imageTaskDtoSchema = z
  .object({
    taskType: z.literal('IMAGE'),
    /**
     * The reference image data. Can be a base64 string or Buffer.
     * @example "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
     */
    reference: z.union([z.string().min(1), z.instanceof(Buffer)]),
    /**
     * The template image data. Can be a base64 string or Buffer.
     * @example "Draw a red square."
     */
    template: z.union([z.string().min(1), z.instanceof(Buffer)]),
    /**
     * The student's response image data. Can be a base64 string or Buffer.
     * @example "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
     */
    studentResponse: z.union([z.string().min(1), z.instanceof(Buffer)]),
    /**
     * An array of image objects, each with a path and mimeType.
     * This field is used to provide additional image data related to the IMAGE taskType.
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
  .strict()
  .superRefine((data, ctx) => {
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
  });

/**
 * Represents the Data Transfer Object (DTO) for image assessment tasks.
 * This type is inferred from `imageTaskDtoSchema`.
 */
export type ImageTaskDto = z.infer<typeof imageTaskDtoSchema>;
