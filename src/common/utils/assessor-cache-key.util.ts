import { createHmac } from 'crypto';

import { type CreateAssessorDto } from 'src/v1/assessor/dto/create-assessor.dto';

type NormalisedValue =
  | string
  | number
  | boolean
  | null
  | NormalisedValue[]
  | { [key: string]: NormalisedValue };

const normaliseValue = (value: unknown): NormalisedValue => {
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }

  if (Array.isArray(value)) {
    return value.map((item) => normaliseValue(item));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const normalised: Record<string, NormalisedValue> = {};
    for (const key of Object.keys(record).sort()) {
      normalised[key] = normaliseValue(record[key]);
    }
    return normalised;
  }

  if (value === undefined) {
    return null;
  }

  return value as NormalisedValue;
};

const stableStringify = (value: unknown): string =>
  JSON.stringify(normaliseValue(value));

export const createAssessorCacheKey = (
  dto: CreateAssessorDto,
  secret: string,
): string => {
  const payload = stableStringify(dto);
  const digest = createHmac('sha256', secret).update(payload).digest('hex');
  return `assessor:${digest}`;
};
