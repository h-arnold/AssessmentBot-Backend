import * as fs from 'fs/promises';
import path from 'path';

import { TablePrompt } from './table.prompt';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tableTask = require(path.join(process.cwd(), 'test/data/tableTask.json'));

jest.mock('fs/promises');

describe('TablePrompt', () => {
  it('should build the final prompt object correctly', async () => {
    const inputs = {
      referenceTask: tableTask.reference,
      studentTask: tableTask.studentResponse,
      emptyTask: tableTask.template,
    };

    const systemTemplate = 'System prompt';
    const userTemplate =
      'Reference:\n{{{referenceTask}}}\n\nStudent:\n{{{studentTask}}}\n\nEmpty:\n{{{emptyTask}}}';

    (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('system')) {
        return Promise.resolve(systemTemplate);
      }
      if (filePath.includes('user')) {
        return Promise.resolve(userTemplate);
      }
      return Promise.reject(new Error('File not found'));
    });

    const prompt = new TablePrompt(inputs);
    const message = await prompt.buildMessage();

    // Log the rendered user message for debugging

    console.info('--- Rendered TablePrompt User Message ---');

    console.info(message.user);

    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('table.system.prompt.md'),
      expect.objectContaining({ encoding: 'utf-8' }),
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('table.user.prompt.md'),
      expect.objectContaining({ encoding: 'utf-8' }),
    );

    expect(message).toEqual({
      system: 'System prompt',
      user: `Reference:\n${tableTask.reference}\n\nStudent:\n${tableTask.studentResponse}\n\nEmpty:\n${tableTask.template}`,
    });
  });
});
