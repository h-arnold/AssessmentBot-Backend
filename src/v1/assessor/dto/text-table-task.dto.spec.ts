import { ZodError } from 'zod';

import {
  textTableTaskDtoSchema,
  TextTableTaskDto,
  TextTableTaskType,
} from './text-table-task.dto';

describe('TextTableTaskDto', () => {
  describe('Validation', () => {
    it('should accept a valid TEXT task payload', () => {
      const validPayload: TextTableTaskDto = {
        taskType: TextTableTaskType.TEXT,
        reference: 'Sample reference text',
        template: 'Sample template text',
        studentResponse: 'Sample student response',
      };
      const result = textTableTaskDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid TABLE task payload', () => {
      const validPayload: TextTableTaskDto = {
        taskType: TextTableTaskType.TABLE,
        reference: 'Sample reference table',
        template: 'Sample template table',
        studentResponse: 'Sample student response table',
      };
      const result = textTableTaskDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject when taskType is missing', () => {
      const payload = {
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
      };
      const result = textTableTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('taskType');
    });

    it('should reject when a required field is missing', () => {
      const payload = {
        taskType: TextTableTaskType.TEXT,
        template: 'test',
        studentResponse: 'test',
      };
      const result = textTableTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('reference');
    });

    it('should reject empty strings for required fields', () => {
      const payload: TextTableTaskDto = {
        taskType: TextTableTaskType.TEXT,
        reference: '',
        template: 'test',
        studentResponse: 'test',
      };
      const result = textTableTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('reference');
    });

    it('should reject payloads with extra fields', () => {
      const payload = {
        taskType: TextTableTaskType.TEXT,
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
        extraField: 'not allowed',
      };
      const result = textTableTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].message).toContain('Unrecognized key');
    });

    it('should reject null for a required field', () => {
      const payload = {
        taskType: TextTableTaskType.TEXT,
        reference: null,
        template: 'test',
        studentResponse: 'test',
      };
      const result = textTableTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject undefined for a required field', () => {
      const payload = {
        taskType: TextTableTaskType.TEXT,
        reference: 'test',
        template: undefined,
        studentResponse: 'test',
      };
      const result = textTableTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject IMAGE taskType', () => {
      const payload = {
        taskType: 'IMAGE',
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
      };
      const result = textTableTaskDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('taskType');
    });
  });
});
