
import * as fs from 'fs/promises';
import * as path from 'path';
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
    const parsed = PromptInputSchema.parse(inputs);
    this.referenceTask = parsed.referenceTask;
    this.studentTask = parsed.studentTask;
    this.emptyTask = parsed.emptyTask;
  }

  protected async readMarkdown(name: string): Promise<string> {
    // Note: Path resolves from the project root, targeting the 'docs' folder directly.
    // This avoids issues with build processes not copying assets.
    const filePath = path.resolve(
      process.cwd(),
      'docs/ImplementationPlan/Stage6/Prompts',
      name,
    );
    return fs.readFile(filePath, 'utf-8');
  }

  protected render(template: string, data: Record<string, string>): string {
    return mustache.render(template, data);
  }

  public abstract buildMessage(): Promise<string | object>;
}
