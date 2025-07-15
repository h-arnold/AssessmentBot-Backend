import { Logger } from '@nestjs/common';
import Mustache from 'mustache';
import { z } from 'zod';

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
  protected referenceTask!: string;
  protected studentTask!: string;
  protected emptyTask!: string;
  protected readonly logger = new Logger(Prompt.name);
  protected userTemplateName?: string;
  protected systemPromptFile?: string;
  protected systemPrompt?: string;

  /**
   * Constructs an instance of the class and initializes its properties
   * by parsing the provided input using the `PromptInputSchema`.
   * Optionally accepts a userTemplateName for rendering user message parts.
   *
   * @param inputs - The raw input data to be parsed into a `PromptInput` object.
   *                 This should conform to the expected schema defined by `PromptInputSchema`.
   * @param userTemplateName - Optional name of the markdown template for user message parts.
   * @throws {ZodError} If the provided `inputs` do not match the expected schema.
   */
  constructor(
    inputs: unknown,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    this.logger.debug(
      `Prompt constructor received inputs: ${JSON.stringify(inputs)}`,
    );
    const parsed: PromptInput = PromptInputSchema.parse(inputs);
    this.referenceTask = parsed.referenceTask;
    this.studentTask = parsed.studentTask;
    this.emptyTask = parsed.emptyTask;
    this.userTemplateName = userTemplateName;
    this.systemPrompt = systemPrompt;
    this.logger.debug(
      `Prompt constructor parsed inputs: ${JSON.stringify(parsed)}`,
    );
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
    this.logger.debug(
      `Rendering template. Data keys: ${Object.keys(data).join(', ')}`,
    );
    this.logger.debug(
      `Render called. this.constructor: ${this && this.constructor ? this.constructor.name : typeof this}`,
    );
    this.logger.debug(
      `Render called. this keys: ${this ? Object.keys(this).join(', ') : 'undefined'}`,
    );
    const renderedContent = Mustache.render(template, data);
    this.logger.debug(`Template rendered. Output:\n${renderedContent}`);
    return renderedContent;
  }

  public abstract buildMessage(): Promise<LlmPayload>;
}
