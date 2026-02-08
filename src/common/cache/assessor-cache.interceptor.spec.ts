import { ExecutionContext } from '@nestjs/common';
import { Observable, firstValueFrom, of } from 'rxjs';

import { createHttpExecutionContext } from '../../../test/utils/http-mocks';
import { ImageValidationPipe } from '../pipes/image-validation.pipe';

type AssessorCacheInterceptorModule = {
  AssessorCacheInterceptor: new (...args: unknown[]) => {
    isRequestCacheable: (ctx: ExecutionContext) => boolean;
    isResponseCacheable: (response: { statusCode?: number }) => boolean;
    intercept: (
      context: ExecutionContext,
      next: { handle: () => Observable<unknown> },
    ) => Promise<Observable<unknown>>;
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

describe('AssessorCacheInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('treats POST /v1/assessor as cacheable', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
    });

    const result = interceptor.isRequestCacheable(context);

    expect(result).toBe(true);
  });

  it('rejects non-assessor routes for caching', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/status',
    });

    const result = interceptor.isRequestCacheable(context);

    expect(result).toBe(false);
  });

  it('rejects non-POST assessor routes for caching', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const { context } = createHttpExecutionContext({
      method: 'GET',
      url: '/v1/assessor',
    });

    const result = interceptor.isRequestCacheable(context);

    expect(result).toBe(false);
  });

  it('does not cache error responses', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode: 500,
    });

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
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode,
    });

    const result = interceptor.isResponseCacheable(
      context.switchToHttp().getResponse(),
    );

    expect(result).toBe(true);
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
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode,
    });

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
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode: 201,
      body: {
        taskType: 'TEXT',
        reference: 'Reference',
        template: 'Template',
        studentResponse: 'Response',
      },
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
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode: 201,
      body: {
        taskType: 'TEXT',
        reference: 'Reference',
        template: 'Template',
        studentResponse: 'Response',
      },
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

  it('bypasses caching when no cache store is configured', async () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode: 201,
      body: {
        taskType: 'TEXT',
        reference: 'Reference',
        template: 'Template',
        studentResponse: 'Response',
      },
    });
    const next = { handle: jest.fn(() => of({ live: true })) };

    const result = await firstValueFrom(
      await interceptor.intercept(context, next),
    );

    expect(result).toEqual({ live: true });
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('treats cache hits without values as misses', async () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const cacheStore = {
      has: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue(undefined),
      getRemainingTtl: jest.fn().mockReturnValue(120000),
      set: jest.fn(),
    };
    const interceptor = new AssessorCacheInterceptor(
      {
        get: jest.fn().mockReturnValue('secret'),
      },
      cacheStore,
    );
    const { context } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode: 201,
      body: {
        taskType: 'TEXT',
        reference: 'Reference',
        template: 'Template',
        studentResponse: 'Response',
      },
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

  it('falls back to a default request size when JSON serialisation fails', () => {
    const { AssessorCacheInterceptor } = loadInterceptor();
    const interceptor = new AssessorCacheInterceptor({
      get: jest.fn().mockReturnValue('secret'),
    });
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const estimatedSize = (
      interceptor as unknown as {
        estimateRequestSize: (body: unknown) => number;
      }
    ).estimateRequestSize(circular);

    expect(estimatedSize).toBe(1024);
  });

  it('validates image payloads before handling the request', async () => {
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
    const transformSpy = jest
      .spyOn(ImageValidationPipe.prototype, 'transform')
      .mockResolvedValue('ok');
    const payload = {
      taskType: 'IMAGE',
      reference: 'data:image/png;base64,abcd',
      template: 'data:image/png;base64,efgh',
      studentResponse: 'data:image/png;base64,ijkl',
    };
    const { context, request } = createHttpExecutionContext({
      method: 'POST',
      url: '/v1/assessor',
      statusCode: 201,
      body: payload,
    });
    const next = { handle: jest.fn(() => of({ live: true })) };

    await firstValueFrom(await interceptor.intercept(context, next));

    expect(transformSpy).toHaveBeenCalledTimes(3);
    expect(transformSpy).toHaveBeenNthCalledWith(1, payload.reference);
    expect(transformSpy).toHaveBeenNthCalledWith(2, payload.studentResponse);
    expect(transformSpy).toHaveBeenNthCalledWith(3, payload.template);
    expect(request.body).toEqual(payload);
  });
});
