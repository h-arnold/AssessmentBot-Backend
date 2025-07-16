jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';
import path from 'path';

import { Logger } from '@nestjs/common';
import * as mustache from 'mustache';

import { TextPrompt } from './text.prompt';
import { isSystemUserMessage } from '../common/utils/type-guards';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const textTask = require(path.join(process.cwd(), 'test/data/textTask.json'));

let systemTemplate: string;
let userTemplate: string;
beforeAll(async () => {
  // Use the real fs to read files before mocking
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const realFs = require('fs');
  systemTemplate = realFs.readFileSync(
    path.join(process.cwd(), 'src/prompt/templates/text.system.prompt.md'),
    { encoding: 'utf-8' },
  );
  userTemplate = realFs.readFileSync(
    path.join(process.cwd(), 'src/prompt/templates/text.user.prompt.md'),
    { encoding: 'utf-8' },
  );
  (fs.readFile as jest.Mock).mockImplementation((filePath: unknown) => {
    const filePathStr = String(filePath);
    if (filePathStr.includes('text.system.prompt.md'))
      return Promise.resolve(systemTemplate);
    if (filePathStr.includes('text.user.prompt.md'))
      return Promise.resolve(userTemplate);
    return Promise.reject(new Error('File not found'));
  });
});

describe('TextPrompt', () => {
  it('should build the final prompt object correctly', async () => {
    const inputs = {
      referenceTask: textTask.referenceTask,
      studentTask: textTask.studentTask,
      emptyTask: textTask.emptyTask,
    };

    // Mock fs.readFile to return correct template content
    jest.spyOn(fs, 'readFile').mockImplementation((filePath: unknown) => {
      const filePathStr = String(filePath);
      if (filePathStr.includes('text.system.prompt.md'))
        return Promise.resolve(systemTemplate);
      if (filePathStr.includes('text.user.prompt.md'))
        return Promise.resolve(userTemplate);
      return Promise.reject(new Error('File not found'));
    });

    const prompt = new TextPrompt(
      inputs,
      'text.user.prompt.md',
      systemTemplate,
    );
    const message = await prompt.buildMessage();

    // Log the rendered user message for debugging
    console.info('--- Rendered TextPrompt User Message ---');
    if (!isSystemUserMessage(message)) {
      throw new Error(
        `Prompt did not return expected object shape. \n Actual message.system: \n ${message.system} \nActual message.user: \n ${message.user}`,
      );
    }
    expect(message.system).toBe(systemTemplate);
    // Render expected user message using Mustache
    const expectedUser = mustache.render(userTemplate, {
      referenceTask: textTask.referenceTask,
      studentTask: textTask.studentTask,
      emptyTask: textTask.emptyTask,
    });
    expect(message.user).toBe(expectedUser);
  });
});
