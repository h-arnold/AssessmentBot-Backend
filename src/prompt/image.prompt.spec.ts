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
});
