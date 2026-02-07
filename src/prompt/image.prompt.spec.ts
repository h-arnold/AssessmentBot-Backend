import { Logger } from '@nestjs/common';

import { ImagePrompt } from './image.prompt';
import { ImagePromptPayload } from '../llm/llm.service.interface';

describe('ImagePrompt', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  it('should build images from data URIs when no files are provided', async () => {
    const inputs = {
      referenceTask: 'data:image/png;base64,REFDATA',
      studentTask: 'data:image/png;base64,STUDENTDATA',
      emptyTask: 'data:image/png;base64,EMPTYDATA',
    };

    const prompt = new ImagePrompt(inputs, logger);
    const message = (await prompt.buildMessage()) as ImagePromptPayload;

    expect(message.images).toEqual([
      { data: 'REFDATA', mimeType: 'image/png' },
      { data: 'EMPTYDATA', mimeType: 'image/png' },
      { data: 'STUDENTDATA', mimeType: 'image/png' },
    ]);
  });

  it('should throw when a data URI is malformed', async () => {
    const inputs = {
      referenceTask: 'data:image/png;base64,REFDATA',
      studentTask: 'not-a-data-uri',
      emptyTask: 'data:image/png;base64,EMPTYDATA',
    };

    const prompt = new ImagePrompt(inputs, logger);

    await expect(prompt.buildMessage()).rejects.toThrow('Invalid Data URI');
  });

  it('should include system prompt when provided', async () => {
    const inputs = {
      referenceTask: 'data:image/png;base64,REFDATA',
      studentTask: 'data:image/png;base64,STUDENTDATA',
      emptyTask: 'data:image/png;base64,EMPTYDATA',
    };

    const systemPrompt = 'system prompt';
    const prompt = new ImagePrompt(inputs, logger, systemPrompt);
    const message = (await prompt.buildMessage()) as ImagePromptPayload;

    expect(message.system).toBe(systemPrompt);
    expect(message.images).toHaveLength(3);
  });
});
