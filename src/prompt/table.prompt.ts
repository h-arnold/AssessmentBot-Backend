import { readFileSync } from 'fs';
import { join } from 'path';

import { Prompt } from './prompt.base';
import { getCurrentDirname } from '../common/file-utils';
import { LlmPayload } from '../llm/llm.service.interface';

/**
 * A prompt for assessing table-based tasks.
 */
export class TablePrompt extends Prompt {
  /**
   * Builds the LLM payload for a table-based assessment.
   * @returns A Promise that resolves to the LlmPayload.
   */
  async buildMessage(): Promise<LlmPayload> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const systemPromptTemplate = readFileSync(
      join(getCurrentDirname(), 'templates', 'table.system.prompt.md'),
      'utf-8',
    );

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const userPromptTemplate = readFileSync(
      join(getCurrentDirname(), 'templates', 'table.user.prompt.md'),
      'utf-8',
    );

    const systemPrompt = this.render(systemPromptTemplate, {});
    const userPrompt = this.render(userPromptTemplate, {
      referenceTask: this.referenceTask,
      studentTask: this.studentTask,
      emptyTask: this.emptyTask,
    });

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }
}
