import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';

import { AssessorController } from './assessor.controller';
import { AssessorCacheInterceptor } from '../../common/cache/assessor-cache.interceptor';

describe('AssessorController caching integration', () => {
  it('applies the assessor cache interceptor to POST /v1/assessor', () => {
    const methodInterceptors: unknown[] =
      Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        AssessorController.prototype.create,
      ) ?? [];

    const classInterceptors: unknown[] =
      Reflect.getMetadata(INTERCEPTORS_METADATA, AssessorController) ?? [];

    const allInterceptors = [...classInterceptors, ...methodInterceptors];

    expect(allInterceptors).toContain(AssessorCacheInterceptor);
  });
});
