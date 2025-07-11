import * as fs from 'fs/promises';

import { TablePrompt } from './table.prompt';

jest.mock('fs/promises');

describe('TablePrompt', () => {
  it('should build the final prompt string correctly', async () => {
    const inputs = {
      referenceTask: '| Ref Header |\n|---|\n| Ref Cell |',
      studentTask: '| Stud Header |\n|---|\n| Stud Cell |',
      emptyTask: '| Empty Header |\n|---|\n| Empty Cell |',
    };

    const template =
      'Reference:\n{{{referenceTask}}}\n\nStudent:\n{{{studentTask}}}\n\nEmpty:\n{{{emptyTask}}}';
    (fs.readFile as jest.Mock).mockResolvedValue(template);

    const prompt = new TablePrompt(inputs);
    const message = await prompt.buildMessage();

    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('tablePrompt.md'),
      expect.objectContaining({ encoding: 'utf-8' }),
    );
    expect(message).toBe(
      'Reference:\n| Ref Header |\n|---|\n| Ref Cell |\n\nStudent:\n| Stud Header |\n|---|\n| Stud Cell |\n\nEmpty:\n| Empty Header |\n|---|\n| Empty Cell |',
    );
  });
});
