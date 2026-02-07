import { ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

type AssessorCacheInterceptorModule = {
  AssessorCacheInterceptor: new (...args: unknown[]) => {
    isRequestCacheable: (ctx: ExecutionContext) => boolean;
    trackBy: (ctx: ExecutionContext) => string | undefined;
    isResponseCacheable: (response: { statusCode?: number }) => boolean;
    intercept: (
      context: ExecutionContext,
      next: { handle: () => ReturnType<typeof of> },
    ) => Promise<ReturnType<typeof of>>;
  };
};

const loadInterceptor = (): AssessorCacheInterceptorModule => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./assessor-cache.interceptor') as AssessorCacheInterceptorModule;
  } catch (err) {
    throw new Error(
      `Expected cache interceptor at src/common/cache/assessor-cache.interceptor.ts. ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
};

const createHttpContext = (
  method: string,
  url: string,
  statusCode = 200,
  body: Record<string, unknown> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url,
        originalUrl: url,
        body,
      }),
      getResponse: () => ({
        statusCode,
      }),
    }),
  }) as unknown as ExecutionContext;

describe('AssessorCacheInterceptor', () => {
  it('treats POST /v1/assessor as cacheable', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('POST', '/v1/assessor');

    const result = interceptor.isRequestCacheable(context);

    expect(result).toBe(true);
  });

  it('rejects non-assessor routes for caching', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('POST', '/v1/status');

    const result = interceptor.isRequestCacheable(context);

    expect(result).toBe(false);
  });

  it('rejects non-POST assessor routes for caching', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('GET', '/v1/assessor');

    const result = interceptor.isRequestCacheable(context);

    expect(result).toBe(false);
  });

  it('returns undefined cache keys for non-assessor routes', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('POST', '/v1/status');

    const key = interceptor.trackBy(context);

    expect(key).toBeUndefined();
  });

  it('does not cache error responses', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('POST', '/v1/assessor', 500);

    const result = interceptor.isResponseCacheable(
      context.switchToHttp().getResponse(),
    );

    expect(result).toBe(false);
  });

  it.each([200, 201])('caches successful %d responses', (statusCode) => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('POST', '/v1/assessor', statusCode);

    const result = interceptor.isResponseCacheable(
      context.switchToHttp().getResponse(),
    );

    expect(result).toBe(true);
  });

  it('derives a namespaced cache key for assessor requests', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('POST', '/v1/assessor', 201, {
      taskType: 'TEXT',
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Response',
    });

    const key = interceptor.trackBy(context);

    expect(key).toMatch(/^assessor:/u);
    expect(key).not.toContain('Reference');
    expect(key).not.toContain('Template');
    expect(key).not.toContain('Response');
  });

  it('produces distinct cache keys for distinct request bodies', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const contextA = createHttpContext('POST', '/v1/assessor', 201, {
      taskType: 'TEXT',
      reference: 'Reference A',
      template: 'Template',
      studentResponse: 'Response',
    });
    const contextB = createHttpContext('POST', '/v1/assessor', 201, {
      taskType: 'TEXT',
      reference: 'Reference B',
      template: 'Template',
      studentResponse: 'Response',
    });

    const keyA = interceptor.trackBy(contextA);
    const keyB = interceptor.trackBy(contextB);

    expect(keyA).not.toBe(keyB);
  });

  it.each([
    [400, 'Bad Request'],
    [401, 'Unauthorised'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [422, 'Unprocessable Entity'],
    [500, 'Internal Server Error'],
    [502, 'Bad Gateway'],
    [503, 'Service Unavailable'],
  ])('does not cache %d (%s) error responses', (statusCode, _statusName) => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const context = createHttpContext('POST', '/v1/assessor', statusCode);

    const result = interceptor.isResponseCacheable(
      context.switchToHttp().getResponse(),
    );

    expect(result).toBe(false);
  });

  it('returns cached responses on cache hits', async () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const cacheStore = {
      has: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue({ cached: true }),
      getRemainingTtl: jest.fn().mockReturnValue(120000),
      set: jest.fn(),
    };
    const interceptor = new AssessorCacheInterceptor(
      {
        get: jest.fn().mockReturnValue('secret'),
      },
      cacheStore,
    );
    const context = createHttpContext('POST', '/v1/assessor', 201, {
      taskType: 'TEXT',
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Response',
    });
    const next = { handle: jest.fn(() => of({ live: true })) };

    const result = await firstValueFrom(
      await interceptor.intercept(context, next),
    );

    expect(result).toEqual({ cached: true });
    expect(next.handle).not.toHaveBeenCalled();
    expect(cacheStore.set).not.toHaveBeenCalled();
  });

  it('stores responses on cache misses for cacheable responses', async () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const cacheStore = {
      has: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      getRemainingTtl: jest.fn().mockReturnValue(60000),
      set: jest.fn(),
    };
    const interceptor = new AssessorCacheInterceptor(
      {
        get: jest.fn().mockReturnValue('secret'),
      },
      cacheStore,
    );
    const context = createHttpContext('POST', '/v1/assessor', 201, {
      taskType: 'TEXT',
      reference: 'Reference',
      template: 'Template',
      studentResponse: 'Response',
    });
    const next = { handle: jest.fn(() => of({ live: true })) };

    const result = await firstValueFrom(
      await interceptor.intercept(context, next),
    );

    expect(result).toEqual({ live: true });
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(cacheStore.set).toHaveBeenCalledWith(
      expect.stringMatching(/^assessor:/u),
      { live: true },
      expect.any(Number),
    );
  });
});
