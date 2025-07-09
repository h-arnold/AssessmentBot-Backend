import { ZodError } from 'zod';
import {
  createAssessorDtoSchema,
  CreateAssessorDto,
  TaskType,
} from './create-assessor.dto';

describe('CreateAssessorDto', () => {
  describe('Validation', () => {
    it('should accept a valid TEXT task payload', () => {
      const validPayload: CreateAssessorDto = {
        taskType: TaskType.TEXT,
        reference: 'Sample reference text',
        template: 'Sample template text',
        studentResponse: 'Sample student response',
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid TABLE task payload', () => {
      const validPayload: CreateAssessorDto = {
        taskType: TaskType.TABLE,
        reference: 'Sample reference table',
        template: 'Sample template table',
        studentResponse: 'Sample student response table',
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid IMAGE task payload with strings', () => {
      const validPayload: CreateAssessorDto = {
        taskType: TaskType.IMAGE,
        reference: 'base64-encoded-image',
        template: 'base64-encoded-image',
        studentResponse: 'base64-encoded-image',
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept a valid IMAGE task payload with Buffers', () => {
      const validPayload = {
        taskType: TaskType.IMAGE,
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
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('taskType');
    });

    it('should reject when a required field is missing', () => {
      const payload = {
        taskType: TaskType.TEXT,
        template: 'test',
        studentResponse: 'test',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('reference');
    });

    it('should reject empty strings for required fields', () => {
      const payload: CreateAssessorDto = {
        taskType: TaskType.TEXT,
        reference: '',
        template: 'test',
        studentResponse: 'test',
      };
      const result = createAssessorDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].path).toContain('reference');
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
      const error = (result as { error: ZodError }).error;
      expect(error.issues[0].message).toContain('Unrecognized key(s)');
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
  });
});
