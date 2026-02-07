import { createHmac } from 'node:crypto';

import {
  TaskType,
  type CreateAssessorDto,
} from '../../v1/assessor/dto/create-assessor.dto';

type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

const base64Marker = ';base64,';

const parseDataUri = (
  value: string,
): { mimeType: string; data: string } | null => {
  if (!value.startsWith('data:')) {
    return null;
  }

  const markerIndex = value.indexOf(base64Marker);
  if (markerIndex === -1) {
    return null;
  }

  const header = value.slice('data:'.length, markerIndex);
  const mimeType = header.split(';')[0]?.toLowerCase() ?? '';
  const data = value.slice(markerIndex + base64Marker.length);

  if (!mimeType || !data) {
    return null;
  }

  return { mimeType, data };
};

const detectBufferMimeType = (buffer: Buffer): string => {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return 'image/gif';
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return 'application/octet-stream';
};

const normaliseImageValue = (value: unknown): CanonicalValue => {
  if (Buffer.isBuffer(value)) {
    return {
      mimeType: detectBufferMimeType(value),
      data: value.toString('base64'),
    };
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const parsed = parseDataUri(value);
    if (parsed) {
      return parsed;
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normaliseImageValue(item));
  }

  if (typeof value === 'object') {
    return value as CanonicalValue;
  }

  return String(value);
};

const sortKeysRecursively = (value: unknown): CanonicalValue => {
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortKeysRecursively(item));
  }

  if (value === null || typeof value !== 'object') {
    return value as CanonicalValue;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([keyA], [keyB]) => keyA.localeCompare(keyB, 'en'),
  );

  return entries.reduce<Record<string, CanonicalValue>>((acc, [key, entry]) => {
    acc[key] = sortKeysRecursively(entry);
    return acc;
  }, {});
};

const buildCachePayload = (dto: CreateAssessorDto): CanonicalValue => {
  if (dto.taskType === TaskType.IMAGE) {
    return {
      taskType: dto.taskType,
      reference: normaliseImageValue(dto.reference),
      template: normaliseImageValue(dto.template),
      studentResponse: normaliseImageValue(dto.studentResponse),
    };
  }

  return {
    taskType: dto.taskType,
    reference: dto.reference,
    template: dto.template,
    studentResponse: dto.studentResponse,
  };
};

export const createAssessorCacheKey = (
  dto: CreateAssessorDto,
  secret: string,
): string => {
  const payload = buildCachePayload(dto);
  const canonicalPayload = JSON.stringify(sortKeysRecursively(payload));

  return createHmac('sha256', secret).update(canonicalPayload).digest('hex');
};
