import * as fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import * as mustache from 'mustache';
import { z } from 'zod';

export const PromptInputSchema = z.object({
  referenceTask: z.string(),
  studentTask: z.string(),
  emptyTask: z.string(),
});

export type PromptInput = z.infer<typeof PromptInputSchema>;

export abstract class Prompt {
  protected referenceTask: string;
  protected studentTask: string;
  protected emptyTask: string;

  constructor(inputs: unknown) {
    const parsed: PromptInput = PromptInputSchema.parse(inputs);
    this.referenceTask = parsed.referenceTask;
    this.studentTask = parsed.studentTask;
    this.emptyTask = parsed.emptyTask;
  }

  protected async readMarkdown(name: string): Promise<string> {
    // Only allow reading from the Prompts directory
    const baseDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../docs/ImplementationPlan/Stage6/Prompts',
    );
    const resolvedPath = path.resolve(baseDir, name);
    if (!resolvedPath.startsWith(baseDir)) {
      throw new Error('Unauthorised file path');
    }
    return await fs.readFile(resolvedPath, { encoding: 'utf-8' });
  }

  protected render(template: string, data: Record<string, string>): string {
    return mustache.render(template, data);
  }

  public abstract buildMessage(): Promise<string | object>;
}
