import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Cache } from 'cache-manager';

import { AssessorCacheInterceptor } from './assessor-cache.interceptor';

describe('AssessorCacheInterceptor', () => {
  it('should allow caching for POST /v1/assessor', () => {
    const cacheManager = {} as Cache;
    const configService = { get: jest.fn() } as const;
    const interceptor = new AssessorCacheInterceptor(
      cacheManager,
      new Reflector(),
      configService,
    );
    const context = {
      switchToHttp: (): { getRequest: () => { method: string; url: string } } => ({
        getRequest: () => ({ method: 'POST', url: '/v1/assessor' }),
      }),
    } as ExecutionContext;

    expect(interceptor.isRequestCacheable(context)).toBe(true);
  });
});
