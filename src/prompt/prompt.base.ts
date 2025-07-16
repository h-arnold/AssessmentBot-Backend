import { Logger } from '@nestjs/common';
import Mustache from 'mustache';
import { z } from 'zod';

import { readMarkdown } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * Zod schema for validating the basic inputs for any prompt.
 */
export const PromptInputSchema = z.object({
  referenceTask: z.string(),
  studentTask: z.string(),
  emptyTask: z.string(),
});

/**
 * Type inferred from the PromptInputSchema.
 */
export type PromptInput = z.infer<typeof PromptInputSchema>;

/**
 * An abstract base class for all prompt types.
 *
 * It handles common functionality such as input validation, template reading,
 * and rendering. Subclasses must implement the `buildMessage` method.
 */
export abstract class Prompt {
  protected referenceTask!: string;
  protected studentTask!: string;
  protected emptyTask!: string;
  protected readonly logger = new Logger(Prompt.name);
  protected userTemplateName?: string;
  protected systemPromptFile?: string;
  protected systemPrompt?: string;

  /**
   * Initializes the Prompt instance.
   * @param inputs The raw, unknown input, which is then validated against the PromptInputSchema.
   * @param userTemplateName Optional name of the markdown template for user message parts.
   * @param systemPrompt Optional system prompt string.
   */
  constructor(
    inputs: unknown,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
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
