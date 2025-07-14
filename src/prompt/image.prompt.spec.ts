import * as fs from 'fs/promises';

import { ImagePrompt } from './image.prompt';

jest.mock('fs/promises');

describe('ImagePrompt', () => {
  it('should build a structured payload with text and images', async () => {
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png'; // Ensure allowed MIME type is lowercase
    const inputs = {
      referenceTask: 'Reference text',
      studentTask: 'Student text',
      emptyTask: 'Empty text',
    };
    const images = [
      { path: 'referenceTask.png', mimeType: 'image/png' },
      { path: 'studentTask.png', mimeType: 'image/png' },
    ];

    const template = 'Prompt: {{{referenceTask}}} and {{{studentTask}}}';
    (fs.readFile as jest.Mock)
      .mockResolvedValueOnce(template) // For the prompt template
      .mockResolvedValueOnce('base64data') // For the reference image
      .mockResolvedValueOnce('base64data'); // For the student image

    const prompt = new ImagePrompt(inputs, images);
    const message = await prompt.buildMessage();

    const baseDir = 'src/prompt/templates';
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('image.prompt.md'),
      { encoding: 'utf-8' },
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('referenceTask.png'),
      { encoding: 'base64' },
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('studentTask.png'),
      { encoding: 'base64' },
    );

    expect(message).toEqual({
      messages: ['Prompt: Reference text and Student text'],
      images: [
        { data: 'base64data', mimeType: 'image/png' },
        { data: 'base64data', mimeType: 'image/png' },
      ],
    });
  });

  it('should reject images with disallowed MIME types', async () => {
    const inputs = {
      referenceTask: 'Reference text',
      studentTask: 'Student text',
      emptyTask: 'Empty text',
    };
    const images = [
      { path: 'ref.png', mimeType: 'image/gif' }, // Not allowed by default
    ];
    const prompt = new ImagePrompt(inputs, images);
    await expect(prompt.readImageFile('ref.png', 'image/gif')).rejects.toThrow(
      'Disallowed image MIME type',
    );
  });

  it('should reject images with missing MIME type', async () => {
    const inputs = {
      referenceTask: 'Reference text',
      studentTask: 'Student text',
      emptyTask: 'Empty text',
    };
    const images = [
      { path: 'ref.png', mimeType: undefined as unknown as string },
    ];
    const prompt = new ImagePrompt(inputs, images);
    await expect(
      prompt.readImageFile('ref.png', undefined as unknown as string),
    ).rejects.toThrow('Disallowed image MIME type');
  });

  it('should reject images with path traversal in filename', async () => {
    const inputs = {
      referenceTask: 'Reference text',
      studentTask: 'Student text',
      emptyTask: 'Empty text',
    };
    const images = [{ path: '../ref.png', mimeType: 'image/png' }];
    const prompt = new ImagePrompt(inputs, images);
    await expect(
      prompt.readImageFile('../ref.png', 'image/png'),
    ).rejects.toThrow('Invalid image filename');
  });

  it('should accept allowed MIME types from env', async () => {
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
    const inputs = {
      referenceTask: 'Reference text',
      studentTask: 'Student text',
      emptyTask: 'Empty text',
    };
    const images = [{ path: 'ref.png', mimeType: 'image/jpeg' }];
    const prompt = new ImagePrompt(inputs, images);
    // Mock fs.readFile to resolve
    (fs.readFile as jest.Mock).mockResolvedValueOnce('base64data');
    await expect(prompt.readImageFile('ref.png', 'image/jpeg')).resolves.toBe(
      'base64data',
    );
  });
});
