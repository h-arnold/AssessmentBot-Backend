
import { TextPrompt } from './text.prompt';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('TextPrompt', () => {
  it('should build the final prompt string correctly', async () => {
    const inputs = {
      referenceTask: 'Reference text',
      studentTask: 'Student text',
      emptyTask: 'Empty text',
    };

    const template = 'Reference: {{{referenceTask}}}, Student: {{{studentTask}}}, Empty: {{{emptyTask}}}';
    (fs.readFile as jest.Mock).mockResolvedValue(template);

    const prompt = new TextPrompt(inputs);
    const message = await prompt.buildMessage();

    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('textPrompt.md'),
      'utf-8',
    );
    expect(message).toBe('Reference: Reference text, Student: Student text, Empty: Empty text');
  });
});
