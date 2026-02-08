import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ImagePrompt } from './image.prompt';
import { PromptFactory } from './prompt.factory';
import { TablePrompt } from './table.prompt';
import { TextPrompt } from './text.prompt';
import { readMarkdown } from '../common/file-utils';
import {
  CreateAssessorDto,
  TaskType,
} from '../v1/assessor/dto/create-assessor.dto';

jest.mock('../common/file-utils', () => ({
  readMarkdown: jest.fn(),
}));

describe('PromptFactory', () => {
  let factory: PromptFactory;
  const readMarkdownMock = readMarkdown as jest.MockedFunction<
    typeof readMarkdown
  >;

  beforeEach(async () => {
    readMarkdownMock.mockResolvedValue('system prompt');
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptFactory, Logger],
    }).compile();

    factory = module.get<PromptFactory>(PromptFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it("should return a TextPrompt for taskType 'TEXT'", () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'ref',
      studentResponse: 'stud',
      template: 'temp',
    };
    return factory.create(dto).then((prompt) => {
      expect(prompt).toBeInstanceOf(TextPrompt);
    });
  });

  it("should return a TablePrompt for taskType 'TABLE'", () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.TABLE,
      reference: 'ref',
      studentResponse: 'stud',
      template: 'temp',
    };
    return factory.create(dto).then((prompt) => {
      expect(prompt).toBeInstanceOf(TablePrompt);
    });
  });

  it("should return an ImagePrompt for taskType 'IMAGE'", () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: 'ref',
      studentResponse: 'stud',
      template: 'temp',
    };
    return factory.create(dto).then((prompt) => {
      expect(prompt).toBeInstanceOf(ImagePrompt);
    });
  });

  it('should throw an error for an unsupported taskType', () => {
    const dto = {
      taskType: 'INVALID',
    } as unknown as CreateAssessorDto;
    return expect(factory.create(dto)).rejects.toThrow(
      'Unsupported task type: INVALID',
    );
  });

  it('logs and rethrows when the system prompt cannot be loaded', async () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'ref',
      studentResponse: 'stud',
      template: 'temp',
    };
    const error = new Error('Missing prompt');
    readMarkdownMock.mockRejectedValueOnce(error);
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();

    await expect(factory.create(dto)).rejects.toThrow('Missing prompt');

    expect(loggerSpy).toHaveBeenCalledWith(
      'Failed to load system prompt template: text.system.prompt.md.',
      expect.any(String),
    );

    loggerSpy.mockRestore();
  });
});
