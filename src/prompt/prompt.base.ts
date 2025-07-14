import * as fs from 'fs/promises';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as path from 'path';

import { Part } from '@google/generative-ai';
import { Part } from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import * as mustache from 'mustache';
import * as mustache from 'mustache';
import { z } from 'zod';
import { z } from 'zod';

import { getCurrentDirname } from '../common/file-utils';
import { getCurrentDirname } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';
import { LlmPayload } from '../llm/llm.service.interface';

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
  protected readonly logger = new Logger(Prompt.name);

  /**
   * Constructs an instance of the class and initializes its properties
   * by parsing the provided input using the `PromptInputSchema`.
   *
   * @param inputs - The raw input data to be parsed into a `PromptInput` object.
   *                 This should conform to the expected schema defined by `PromptInputSchema`.
   * @throws {ZodError} If the provided `inputs` do not match the expected schema.
   */
  constructor(inputs: unknown) {
    this.logger.debug(`Prompt constructor received inputs: ${JSON.stringify(inputs)}`);
    const parsed: PromptInput = PromptInputSchema.parse(inputs);
    this.referenceTask = parsed.referenceTask;
    this.studentTask = parsed.studentTask;
    this.emptyTask = parsed.emptyTask;
    this.logger.debug(`Prompt constructor parsed inputs: ${JSON.stringify(parsed)}`);
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
    this.logger.debug(`Attempting to read markdown file: ${name}`);
    // Security: Only allow reading from the Prompts directory, and block path traversal
    if (name.includes('..') || !name.endsWith('.md')) {
      throw new Error('Invalid markdown filename');
    }

    const baseDir = path.resolve(process.cwd(), 'src/prompt/templates');
    const resolvedPath = path.resolve(baseDir, name);
    if (!resolvedPath.startsWith(baseDir)) {
      throw new Error('Unauthorised file path');
    }
    // Security: Path is validated above, safe to read
    const content = await fs.readFile(resolvedPath, { encoding: 'utf-8' });
    this.logger.debug(`Successfully read markdown file: ${name}, content length: ${content.length}`);
    return content;
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
    this.logger.debug(`Rendering template. Data keys: ${Object.keys(data).join(', ')}`);
    const renderedContent = mustache.render(template, data);
    this.logger.debug(`Template rendered. Content length: ${renderedContent.length}`);
    return renderedContent;
  }

  /**
   * Builds the user message content as an array of Parts.
   * Subclasses must implement this to provide specific message structures.
   */
  protected abstract buildUserMessageParts(): Promise<Part[]>;

  public abstract buildMessage(): Promise<LlmPayload>;
}
