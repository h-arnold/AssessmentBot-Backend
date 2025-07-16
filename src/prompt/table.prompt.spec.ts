jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';
import path from 'path';

import * as mustache from 'mustache';

import { TablePrompt } from './table.prompt';
import { isSystemUserMessage } from '../common/utils/type-guards';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tableTask = require(path.join(process.cwd(), 'test/data/tableTask.json'));

let systemTemplate: string;
let userTemplate: string;
beforeAll(async () => {
  // Use the real fs to read files before mocking
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const realFs = require('fs');
  systemTemplate = realFs.readFileSync(
    path.join(process.cwd(), 'src/prompt/templates/table.system.prompt.md'),
    { encoding: 'utf-8' },
  );
  userTemplate = realFs.readFileSync(
    path.join(process.cwd(), 'src/prompt/templates/table.user.prompt.md'),
    { encoding: 'utf-8' },
  );
  (fs.readFile as jest.Mock).mockImplementation((filePath: unknown) => {
    const filePathStr = String(filePath);
    if (filePathStr.includes('table.system.prompt.md'))
      return Promise.resolve(systemTemplate);
    if (filePathStr.includes('table.user.prompt.md'))
      return Promise.resolve(userTemplate);
    return Promise.reject(new Error('File not found'));
  });
});

describe('TablePrompt', () => {
  it('should build the final prompt object correctly', async () => {
    const inputs = {
      referenceTask: tableTask.referenceTask,
      studentTask: tableTask.studentTask,
      emptyTask: tableTask.emptyTask,
    };

    // Mock fs.readFile to return correct template content
    jest.spyOn(fs, 'readFile').mockImplementation((filePath: unknown) => {
      const filePathStr = String(filePath);
      if (filePathStr.includes('table.system.prompt.md'))
        return Promise.resolve(systemTemplate);
      if (filePathStr.includes('table.user.prompt.md'))
        return Promise.resolve(userTemplate);
      return Promise.reject(new Error('File not found'));
    });

    const prompt = new TablePrompt(
      inputs,
      'table.user.prompt.md',
      systemTemplate,
    );
    const message = await prompt.buildMessage();

    // Log the rendered user message for debugging
    console.info('--- Rendered TablePrompt User Message ---');
    if (!isSystemUserMessage(message)) {
      throw new Error(
        'Prompt did not return expected object shape. \n Rendered TablePrompt User Message: ${message.user)',
      );
    }
    expect(message.system).toBe(systemTemplate);
    // Render expected user message using Mustache
    const expectedUser = mustache.render(userTemplate, {
      referenceTask: tableTask.referenceTask,
      studentTask: tableTask.studentTask,
      emptyTask: tableTask.emptyTask,
    });
    expect(message.user).toBe(expectedUser);
  });
});
