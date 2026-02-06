import * as fs from 'node:fs';

import {
  TaskType,
  type CreateAssessorDto,
} from '../../v1/assessor/dto/create-assessor.dto';

type CacheKeyUtilModule = {
  createAssessorCacheKey: (dto: CreateAssessorDto, secret: string) => string;
};

const loadCacheKeyUtil = (): CacheKeyUtilModule => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./cache-key.util') as CacheKeyUtilModule;
  } catch (err) {
    throw new Error(
      `Expected cache key utility at src/common/cache/cache-key.util.ts. ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
};

describe('createAssessorCacheKey', () => {
  const secret = 'test-secret';

  it('returns a stable hash for identical DTOs', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response',
    };

    const keyA = createAssessorCacheKey(dto, secret);
    const keyB = createAssessorCacheKey(dto, secret);

    expect(keyA).toBe(keyB);
  });

  it('returns a different hash when DTO content changes', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dtoA: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response',
    };
    const dtoB: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response (changed)',
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).not.toBe(keyB);
  });

  it('treats whitespace differences as distinct payloads', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dtoA: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response',
    };
    const dtoB: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response ',
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).not.toBe(keyB);
  });

  it('treats leading whitespace differences as distinct payloads', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dtoA: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response',
    };
    const dtoB: CreateAssessorDto = {
      ...dtoA,
      studentResponse: ' Student response',
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).not.toBe(keyB);
  });

  it('treats multiple consecutive spaces as distinct from single spaces', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dtoA: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student  response',
    };
    const dtoB: CreateAssessorDto = {
      ...dtoA,
      studentResponse: 'Student response',
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).not.toBe(keyB);
  });

  it('does not include raw student data in the cache key', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Private reference text',
      template: 'Private template text',
      studentResponse: 'Private student response',
    };

    const key = createAssessorCacheKey(dto, secret);

    expect(key).not.toContain('Private reference text');
    expect(key).not.toContain('Private template text');
    expect(key).not.toContain('Private student response');
  });

  it('normalises Buffer fields consistently', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const bufferA = Buffer.from('image-bytes');
    const bufferB = Buffer.from('image-bytes');

    const dtoA: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: bufferA,
      template: bufferA,
      studentResponse: bufferA,
    };

    const dtoB: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: bufferB,
      template: bufferB,
      studentResponse: bufferB,
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).toBe(keyB);
  });

  it('is independent of object key order', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();

    const dtoA: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response',
    };

    const dtoB: CreateAssessorDto = {
      studentResponse: 'Student response',
      template: 'Template',
      reference: 'Reference',
      taskType: TaskType.TEXT,
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).toBe(keyB);
  });

  it('depends on the secret value', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Student response',
    };

    const keyA = createAssessorCacheKey(dto, 'secret-a');
    const keyB = createAssessorCacheKey(dto, 'secret-b');

    expect(keyA).not.toBe(keyB);
  });

  it('excludes systemPromptFile field from cache key derivation', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dtoA: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: 'data:image/png;base64,aaaa',
      template: 'data:image/png;base64,bbbb',
      studentResponse: 'data:image/png;base64,cccc',
      systemPromptFile: '/tmp/prompt-a.txt',
    };
    const dtoB: CreateAssessorDto = {
      ...dtoA,
      systemPromptFile: '/tmp/prompt-b.txt',
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).toBe(keyB);
  });

  it('uses file content hashes for images array entries', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const imagePath = '/tmp/assessor-cache-image.png';

    fs.writeFileSync(imagePath, 'image-content-v1');

    const dto: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: 'data:image/png;base64,aaaa',
      template: 'data:image/png;base64,bbbb',
      studentResponse: 'data:image/png;base64,cccc',
      images: [{ path: imagePath, mimeType: 'image/png' }],
    };

    const keyA = createAssessorCacheKey(dto, secret);

    fs.writeFileSync(imagePath, 'image-content-v2');
    const keyB = createAssessorCacheKey(dto, secret);

    expect(keyA).not.toBe(keyB);
  });

  it('ignores text fields when images array entries are present', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    fs.writeFileSync('/tmp/image.png', 'image-content');
    const dtoA: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: 'data:image/png;base64,aaaa',
      template: 'data:image/png;base64,bbbb',
      studentResponse: 'data:image/png;base64,cccc',
      images: [{ path: '/tmp/image.png', mimeType: 'image/png' }],
    };
    const dtoB: CreateAssessorDto = {
      ...dtoA,
      studentResponse: 'data:image/png;base64,dddd',
    };

    const keyA = createAssessorCacheKey(dtoA, secret);
    const keyB = createAssessorCacheKey(dtoB, secret);

    expect(keyA).toBe(keyB);
  });

  it('throws when an image path is missing', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const dto: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: 'data:image/png;base64,aaaa',
      template: 'data:image/png;base64,bbbb',
      studentResponse: 'data:image/png;base64,cccc',
      images: [
        {
          path: '/tmp/assessor-cache-missing.png',
          mimeType: 'image/png',
        },
      ],
    };

    expect(() => createAssessorCacheKey(dto, secret)).toThrow();
  });

  it('treats identical Buffer and data URI string representations equally', () => {
    const { createAssessorCacheKey } = loadCacheKeyUtil();
    const imgContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const base64Str = imgContent.toString('base64'); // iVBO
    const dataUri = `data:image/png;base64,${base64Str}`;

    const dtoWithBuffer: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: imgContent,
      template: imgContent,
      studentResponse: imgContent,
    };

    const dtoWithDataUri: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: dataUri,
      template: dataUri,
      studentResponse: dataUri,
    };

    const keyWithBuffer = createAssessorCacheKey(dtoWithBuffer, secret);
    const keyWithDataUri = createAssessorCacheKey(dtoWithDataUri, secret);

    expect(keyWithBuffer).toBe(keyWithDataUri);
  });
});
