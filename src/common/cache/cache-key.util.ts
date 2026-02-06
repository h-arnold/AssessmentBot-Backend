import { createHash, createHmac } from 'node:crypto';
import * as fs from 'node:fs';

import {
  TaskType,
  type CreateAssessorDto,
} from '../../v1/assessor/dto/create-assessor.dto';

export interface CacheKeyOptions {
  prefix?: string;
}

interface ImageCacheEntry {
  mimeType: string;
  contentHash: string;
}

const hashImageFileContents = (filePath: string): string => {
  // filePath comes from validated DTO input; errors should fail fast
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const fileContents = fs.readFileSync(filePath);
  return createHash('sha256').update(fileContents).digest('hex');
};

const normaliseValue = (value: unknown): unknown => {
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normaliseValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

    const normalised: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      normalised[key] = normaliseValue(entryValue);
    }
    return normalised;
  }

  return value;
};

const buildCachePayload = (dto: CreateAssessorDto): Record<string, unknown> => {
  if (
    dto.taskType === TaskType.IMAGE &&
    Array.isArray(dto.images) &&
    dto.images.length > 0
  ) {
    const images: ImageCacheEntry[] = dto.images.map((image) => ({
      mimeType: image.mimeType,
      contentHash: hashImageFileContents(image.path),
    }));

    return {
      taskType: dto.taskType,
      images,
    };
  }

  const payload: Record<string, unknown> = {
    taskType: dto.taskType,
    reference: dto.reference,
    template: dto.template,
    studentResponse: dto.studentResponse,
  };

  if (dto.taskType === TaskType.IMAGE && dto.images !== undefined) {
    payload.images = dto.images;
  }

  return payload;
};

/**
 * Builds a privacy-preserving cache key for assessor requests.
 */
export function createAssessorCacheKey(
  dto: CreateAssessorDto,
  secret: string,
  options: CacheKeyOptions = {},
): string {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('Assessor cache secret must be a non-empty string.');
  }

  const payload = buildCachePayload(dto);
  const canonicalPayload = normaliseValue(payload);
  const canonicalJson = JSON.stringify(canonicalPayload);
  const hmac = createHmac('sha256', secret).update(canonicalJson).digest('hex');
  const prefix = options.prefix ?? '';

  return `${prefix}${hmac}`;
}
