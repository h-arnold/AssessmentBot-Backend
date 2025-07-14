import * as fs from 'fs/promises';
import path from 'path';

import { TextPrompt } from './text.prompt';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const textTask = require(path.join(process.cwd(), 'test/data/textTask.json'));

jest.mock('fs/promises');

describe('TextPrompt', () => {
  it('should build the final prompt object correctly', async () => {
    const inputs = {
      referenceTask: textTask.referenceTask,
      studentTask: textTask.studentTask,
      emptyTask: textTask.templateTask,
    };

    const systemTemplate = 'System prompt';
    const userTemplate =
      'Reference: {{{referenceTask}}}, Student: {{{studentTask}}}, Empty: {{{emptyTask}}}';

    (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('system')) {
        return Promise.resolve(systemTemplate);
      }
      if (filePath.includes('user')) {
        return Promise.resolve(userTemplate);
      }
      return Promise.reject(new Error('File not found'));
    });

    const prompt = new TextPrompt(inputs);
    const message = await prompt.buildMessage();

    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('text.system.prompt.md'),
      expect.objectContaining({ encoding: 'utf-8' }),
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('text.user.prompt.md'),
      expect.objectContaining({ encoding: 'utf-8' }),
    );

    expect(message).toEqual({
      system: 'System prompt',
      user: `Reference: ${textTask.referenceTask}, Student: ${textTask.studentTask}, Empty: ${textTask.templateTask}`,
    });
  });
});
