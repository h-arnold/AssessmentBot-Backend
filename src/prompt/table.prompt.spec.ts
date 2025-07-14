import * as fs from 'fs/promises';

import { TablePrompt } from './table.prompt';

jest.mock('fs/promises');

describe('TablePrompt', () => {
  it('should build the final prompt object correctly', async () => {
    const inputs = {
      referenceTask: '| Ref Header |\n---|\n| Ref Cell |',
      studentTask: '| Stud Header |\n---|\n| Stud Cell |',
      emptyTask: '| Empty Header |\n---|\n| Empty Cell |',
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
      user: 'Reference:\n| Ref Header |\n---|\n| Ref Cell |\n\nStudent:\n| Stud Header |\n---|\n| Stud Cell |\n\nEmpty:\n| Empty Header |\n---|\n| Empty Cell |',
    });
  });
});
