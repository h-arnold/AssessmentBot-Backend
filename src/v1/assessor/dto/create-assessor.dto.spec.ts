import { ZodError } from 'zod';

import {
  createAssessorDtoSchema,
  CreateAssessorDto,
  TaskType,
} from './create-assessor.dto';
import { TextTableTaskType } from './text-table-task.dto';

describe('CreateAssessorDto', () => {
  describe('Validation', () => {
    it('should accept a valid TEXT task payload', () => {
      const validPayload: CreateAssessorDto = {
        taskType: TextTableTaskType.TEXT,
        reference: 'Sample reference text',
        template: 'Sample template text',
        studentResponse: 'Sample student response',
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid TABLE task payload', () => {
      const validPayload: CreateAssessorDto = {
        taskType: TextTableTaskType.TABLE,
        reference: 'Sample reference table',
        template: 'Sample template table',
        studentResponse: 'Sample student response table',
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid IMAGE task payload with strings', () => {
      const validPayload: CreateAssessorDto = {
        taskType: 'IMAGE',
        reference: 'base64-encoded-image',
        template: 'base64-encoded-image',
        studentResponse: 'base64-encoded-image',
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid IMAGE task payload with Buffers', () => {
      const validPayload = {
        taskType: 'IMAGE',
        reference: Buffer.from('image data'),
        template: Buffer.from('image data'),
        studentResponse: Buffer.from('image data'),
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject when taskType is missing', () => {
      const payload = {
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      // Union validation will show multiple error paths, but one should mention taskType
      const error = (result as { error: ZodError }).error;
      const hasTaskTypeError = error.issues.some(
        (issue) =>
          issue.path.length === 0 ||
          issue.path.includes('taskType') ||
          issue.message.includes('taskType') ||
          issue.message.includes('union'),
      );
      expect(hasTaskTypeError).toBe(true);
    });

    it('should reject when a required field is missing', () => {
      const payload = {
        taskType: TaskType.TEXT,
        template: 'test',
        studentResponse: 'test',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      // Union validation will show that it doesn't match any union member
      const error = (result as { error: ZodError }).error;
      expect(error.issues.length).toBeGreaterThan(0);
    });

    it('should reject empty strings for required fields', () => {
      const payload: CreateAssessorDto = {
        taskType: TextTableTaskType.TEXT,
        reference: '',
        template: 'test',
        studentResponse: 'test',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      const hasReferenceError = error.issues.some(
        (issue) =>
          issue.path.includes('reference') ||
          issue.message.includes('reference'),
      );
      expect(hasReferenceError).toBe(true);
    });

    it('should reject payloads with extra fields', () => {
      const payload = {
        taskType: TaskType.TEXT,
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
        extraField: 'not allowed',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      // Union validation will show unrecognized key errors
      const error = (result as { error: ZodError }).error;
      expect(error.issues.length).toBeGreaterThan(0);
    });

    it('should reject null for a required field', () => {
      const payload = {
        taskType: TaskType.TEXT,
        reference: null,
        template: 'test',
        studentResponse: 'test',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject undefined for a required field', () => {
      const payload = {
        taskType: TaskType.TEXT,
        reference: 'test',
        template: undefined,
        studentResponse: 'test',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject an IMAGE task payload with mixed string and Buffer types', () => {
      const payload = {
        taskType: 'IMAGE',
        reference: 'a string',
        template: Buffer.from('a buffer'),
        studentResponse: 'another string',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].message).toContain(
        'For IMAGE taskType, reference, template, and studentResponse must all be of the same type',
      );
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
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });
});
