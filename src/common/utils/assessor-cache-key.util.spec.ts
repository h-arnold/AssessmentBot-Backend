import { createAssessorCacheKey } from './assessor-cache-key.util';
import { TaskType, type CreateAssessorDto } from '../../v1/assessor/dto/create-assessor.dto';

describe('createAssessorCacheKey', () => {
  const baseDto: CreateAssessorDto = {
    taskType: TaskType.TEXT,
    reference: 'Reference text',
    template: 'Template text',
    studentResponse: 'Student response',
  };

  it('should produce deterministic keys for identical DTOs', () => {
    const first = createAssessorCacheKey(baseDto, 'secret');
    const second = createAssessorCacheKey(baseDto, 'secret');

    expect(first).toBe(second);
  });

  it('should produce different keys when any DTO field changes', () => {
    const first = createAssessorCacheKey(baseDto, 'secret');
    const changed = createAssessorCacheKey(
      { ...baseDto, studentResponse: 'Different response' },
      'secret',
    );

    expect(first).not.toBe(changed);
  });

  it('should produce different keys when the secret changes', () => {
    const first = createAssessorCacheKey(baseDto, 'secret-one');
    const second = createAssessorCacheKey(baseDto, 'secret-two');

    expect(first).not.toBe(second);
  });

  it('should avoid plaintext student data in the cache key', () => {
    const key = createAssessorCacheKey(baseDto, 'secret');

    expect(key).not.toContain(baseDto.studentResponse);
  });
});
