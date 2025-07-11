import * as fs from 'fs/promises';
import path from 'path';

import * as mustache from 'mustache';
import { z } from 'zod';

import { getCurrentDirname } from '../common/file-utils';

/**
 * Schema definition for validating the input structure of a prompt.
 *
 * This schema ensures that the input object contains the following properties:
 * - `referenceTask`: A string representing the reference task.
 * - `studentTask`: A string representing the student's task.
 * - `emptyTask`: A string representing an empty task.
 *
 * The schema is used for runtime validation of the input data.
 */
export const PromptInputSchema = z.object({
  referenceTask: z.string(),
  studentTask: z.string(),
  emptyTask: z.string(),
});

/**
 * Represents the input type for a prompt, inferred from the `PromptInputSchema`.
 * This type is dynamically generated based on the schema definition using Zod.
 *
 * @typedef PromptInput
 */
export type PromptInput = z.infer<typeof PromptInputSchema>;

export abstract class Prompt {
  protected referenceTask: string;
  protected studentTask: string;
  protected emptyTask: string;

  /**
   * Constructs an instance of the class and initializes its properties
   * by parsing the provided input using the `PromptInputSchema`.
   *
   * @param inputs - The raw input data to be parsed into a `PromptInput` object.
   *                 This should conform to the expected schema defined by `PromptInputSchema`.
   *
   * @throws {ZodError} If the provided `inputs` do not match the expected schema.
   */
  constructor(inputs: unknown) {
    const parsed: PromptInput = PromptInputSchema.parse(inputs);
    this.referenceTask = parsed.referenceTask;
    this.studentTask = parsed.studentTask;
    this.emptyTask = parsed.emptyTask;
  }

  /**
   * Reads the content of a markdown file from the specified Prompts directory.
   *
   * This method ensures security by validating the filename and path to prevent
   * path traversal attacks and unauthorized file access.
   *
   * @param name - The name of the markdown file to read. Must end with `.md` and
   *               must not contain path traversal sequences (`..`).
   * @returns A promise that resolves to the content of the markdown file as a string.
   * @throws {Error} If the filename is invalid or the resolved path is unauthorized.
   *
   * Security Considerations:
   * - Only files within the `Prompts` directory are allowed to be read.
   * - Path traversal and unauthorised file access are blocked by validation checks.
   */
  protected async readMarkdown(name: string): Promise<string> {
    // Security: Only allow reading from the Prompts directory, and block path traversal
    if (name.includes('..') || !name.endsWith('.md')) {
      throw new Error('Invalid markdown filename');
    }

    // TODO: Update this path to get a production-ready path.
    const baseDir = path.resolve(
      getCurrentDirname(),
      '../../../docs/ImplementationPlan/Stage6/Prompts',
    );
    const resolvedPath = path.resolve(baseDir, name);
    if (!resolvedPath.startsWith(baseDir)) {
      throw new Error('Unauthorised file path');
    }
    // Security: Path is validated above, safe to read
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return await fs.readFile(resolvedPath, { encoding: 'utf-8' });
  }

  /**
   * Renders a template string using the provided data.
   * This method utilizes the Mustache templating engine to replace placeholders
   * in the template with corresponding values from the data object.
   *
   * @param template - The template string containing placeholders in Mustache format.
   * @param data - A record object where keys correspond to placeholder names in the template
   *               and values are the replacement strings.
   * @returns The rendered string with placeholders replaced by their corresponding values.
   */
  protected render(template: string, data: Record<string, string>): string {
    return mustache.render(template, data);
  }

  public abstract buildMessage(): Promise<string | object>;
}
