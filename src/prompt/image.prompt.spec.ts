import * as fs from 'fs/promises';

import { ImagePrompt } from './image.prompt';

jest.mock('fs/promises');

describe('ImagePrompt', () => {
  it('should build a structured payload with text and images', async () => {
    const inputs = {
      referenceTask: 'Reference text',
      studentTask: 'Student text',
      emptyTask: 'Empty text',
    };
    const images = [
      { path: 'path/to/ref.png', mimeType: 'image/png' },
      { path: 'path/to/stud.png', mimeType: 'image/png' },
    ];

    const template = 'Prompt: {{{referenceTask}}} and {{{studentTask}}}';
    (fs.readFile as jest.Mock)
      .mockResolvedValueOnce(template) // For the prompt template
      .mockResolvedValueOnce('ref_image_base64') // For the reference image
      .mockResolvedValueOnce('stud_image_base64'); // For the student image

    const prompt = new ImagePrompt(inputs, images);
    const message = await prompt.buildMessage();

    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('imagePrompt.md'),
      'utf-8',
    );
    expect(fs.readFile).toHaveBeenCalledWith('path/to/ref.png', 'base64');
    expect(fs.readFile).toHaveBeenCalledWith('path/to/stud.png', 'base64');

    expect(message).toEqual({
      messages: ['Prompt: Reference text and Student text'],
      images: [
        { data: 'ref_image_base64', mimeType: 'image/png' },
        { data: 'stud_image_base64', mimeType: 'image/png' },
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
