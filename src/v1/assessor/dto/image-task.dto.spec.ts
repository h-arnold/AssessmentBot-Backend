import { ZodError } from 'zod';

import { imageTaskDtoSchema, ImageTaskDto } from './image-task.dto';

describe('ImageTaskDto', () => {
  describe('Validation', () => {
    it('should accept a valid IMAGE task payload with strings', () => {
      const validPayload: ImageTaskDto = {
        taskType: 'IMAGE',
        reference: 'base64-encoded-image',
        template: 'base64-encoded-image',
        studentResponse: 'base64-encoded-image',
      };
      const result = imageTaskDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid IMAGE task payload with Buffers', () => {
      const validPayload = {
        taskType: 'IMAGE',
        reference: Buffer.from('image data'),
        template: Buffer.from('image data'),
        studentResponse: Buffer.from('image data'),
      };
      const result = imageTaskDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid IMAGE task payload with base64 strings', () => {
      const validPayload = {
        taskType: 'IMAGE',
        reference:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        template:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        studentResponse:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      };
      const result = imageTaskDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept optional images array', () => {
      const validPayload: ImageTaskDto = {
        taskType: 'IMAGE',
        reference: 'base64-encoded-image',
        template: 'base64-encoded-image',
        studentResponse: 'base64-encoded-image',
        images: [
          { path: '/images/image1.png', mimeType: 'image/png' },
          { path: '/images/image2.jpg', mimeType: 'image/jpeg' },
        ],
      };
      const result = imageTaskDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept optional systemPromptFile', () => {
      const validPayload: ImageTaskDto = {
        taskType: 'IMAGE',
        reference: 'base64-encoded-image',
        template: 'base64-encoded-image',
        studentResponse: 'base64-encoded-image',
        systemPromptFile: 'custom-prompt.md',
      };
      const result = imageTaskDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject when taskType is missing', () => {
      const payload = {
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('taskType');
    });

    it('should reject when a required field is missing', () => {
      const payload = {
        taskType: 'IMAGE',
        template: 'test',
        studentResponse: 'test',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('reference');
    });

    it('should reject empty strings for required fields', () => {
      const payload: ImageTaskDto = {
        taskType: 'IMAGE',
        reference: '',
        template: 'test',
        studentResponse: 'test',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('reference');
    });

    it('should reject payloads with extra fields', () => {
      const payload = {
        taskType: 'IMAGE',
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
        extraField: 'not allowed',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].message).toContain('Unrecognized key');
    });

    it('should reject null for a required field', () => {
      const payload = {
        taskType: 'IMAGE',
        reference: null,
        template: 'test',
        studentResponse: 'test',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject undefined for a required field', () => {
      const payload = {
        taskType: 'IMAGE',
        reference: 'test',
        template: undefined,
        studentResponse: 'test',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject mixed string and Buffer types', () => {
      const payload = {
        taskType: 'IMAGE',
        reference: 'a string',
        template: Buffer.from('a buffer'),
        studentResponse: 'another string',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].message).toContain(
        'For IMAGE taskType, reference, template, and studentResponse must all be of the same type',
      );
    });

    it('should reject non-IMAGE taskType', () => {
      const payload = {
        taskType: 'TEXT',
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
      };
      const result = imageTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('taskType');
    });
  });
});
