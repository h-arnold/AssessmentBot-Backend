import { Logger } from '@nestjs/common';
import Mustache from 'mustache';
import { z } from 'zod';

import { readMarkdown } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Zod schema for validating basic inputs required for any prompt.
 *
 * This schema ensures that all prompt types receive the essential
 * data needed for assessment: a reference task, student task, and
 * empty task template.
 */
export const PromptInputSchema = z.object({
  /** The reference or model solution for the task */
  referenceTask: z.string(),
  /** The student's submitted response to the task */
  studentTask: z.string(),
  /** The original task prompt or template given to the student */
  emptyTask: z.string(),
});

/**
 * Type representing validated prompt input data.
 */
export type PromptInput = z.infer<typeof PromptInputSchema>;

/**
 * Abstract base class for all prompt implementations.
 *
 * This class provides common functionality for prompt generation including:
 * - Input validation using Zod schemas
 * - Template loading and rendering with Mustache
 * - Common properties and lifecycle management
 *
 * Subclasses must implement the `buildMessage` method to create
 * task-specific LLM payloads appropriate for their assessment type.
 *
 * @abstract
 */
export abstract class Prompt {
  protected referenceTask!: string;
  protected studentTask!: string;
  protected emptyTask!: string;
  protected readonly logger: Logger;
  protected userTemplateName?: string;
  protected systemPromptFile?: string;
  protected systemPrompt?: string;

  /**
   * Initialises the Prompt instance with validated input data.
   *
   * This constructor validates the provided inputs against the schema,
   * stores the validated data as instance properties, and configures
   * the prompt with template and system prompt information.
   *
   * @param inputs - Raw input data to be validated against PromptInputSchema
   * @param logger - Logger instance for recording prompt operations
   * @param userTemplateName - Optional name of the markdown template for user message parts
   * @param systemPrompt - Optional system prompt string for LLM context
   * @throws Error if input validation fails
   */
  constructor(
    inputs: unknown,
    logger: Logger,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    this.logger = logger;
    // Prompt constructor received inputs is set to verbose logging because it can output the base64 strings from image prompts, which often isn't particularly helpful for debugging.
    this.logger.verbose(
      `Prompt constructor received inputs: ${JSON.stringify(inputs)}`,
    );
    const parsed: PromptInput = PromptInputSchema.parse(inputs);
    this.referenceTask = parsed.referenceTask;
    this.studentTask = parsed.studentTask;
    this.emptyTask = parsed.emptyTask;
    this.userTemplateName = userTemplateName;
    this.systemPrompt = systemPrompt;

    this.logInputLengths(parsed);
  }

  /**
   * Logs the length of each input element at info level.
   * @param inputs The validated PromptInput object.
   */
  private logInputLengths(inputs: PromptInput): void {
    const keys: (keyof PromptInput)[] = [
      'referenceTask',
      'studentTask',
      'emptyTask',
    ];
    const lengths = keys
      .map((key) => {
        const value = inputs[key];
        return `${key}: ${typeof value === 'string' ? value.length : 'N/A'}`;
      })
      .join(', ');
    this.logger.log(`Prompt input lengths - ${lengths}`);
  }

  /**
   * Renders a template string using mustache with the provided data.
   * @param template The template string to render.
   * @param data A record of key-value pairs to substitute in the template.
   * @returns The rendered string.
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

  /**
   * Builds the final payload to be sent to the LLM service.
   * This method must be implemented by all subclasses.
   * @returns A Promise that resolves to the LlmPayload.
   */
  /**
   * Builds the final payload to be sent to the LLM service.
   * This is the default implementation for text and table prompts.
   * Subclasses can override if needed (e.g., ImagePrompt).
   * @returns A Promise that resolves to the LlmPayload.
   */
  public async buildMessage(): Promise<LlmPayload> {
    this.logger.debug(`Building message for ${this.constructor.name}`);
    let userMessage = '';
    if (this.userTemplateName) {
      const userTemplate = await readMarkdown(this.userTemplateName);
      userMessage = this.render(userTemplate, {
        referenceTask: this.referenceTask,
        studentTask: this.studentTask,
        emptyTask: this.emptyTask,
      });
      this.logger.debug(`Rendered user message length: ${userMessage.length}`);
    }
    return {
      system: this.systemPrompt ?? '',
      user: userMessage,
    };
  }
}
