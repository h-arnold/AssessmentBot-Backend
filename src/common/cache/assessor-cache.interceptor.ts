import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Observable, from, of } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

import { createAssessorCacheKey } from './cache-key.util';
import { ConfigService } from '../../config/config.service';
import type { CreateAssessorDto } from '../../v1/assessor/dto/create-assessor.dto';

/**
 * Interceptor for assessor caching behaviour.
 *
 */
@Injectable()
export class AssessorCacheInterceptor implements NestInterceptor {
  private readonly cacheManager: Cache;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager?: Cache,
  ) {
    const fallbackCache = new Map<string, unknown>();
    this.cacheManager =
      cacheManager ??
      ({
        get: async (key: string): Promise<unknown> => fallbackCache.get(key),
        set: async (key: string, value: unknown): Promise<void> => {
          fallbackCache.set(key, value);
        },
        del: async (key: string): Promise<void> => {
          fallbackCache.delete(key);
        },
        reset: async (): Promise<void> => {
          fallbackCache.clear();
        },
        wrap: async (
          key: string,
          fn: () => Promise<unknown>,
        ): Promise<unknown> => {
          if (fallbackCache.has(key)) {
            return fallbackCache.get(key);
          }
          const value = await fn();
          fallbackCache.set(key, value);
          return value;
        },
        store: {},
      } as unknown as Cache);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.isRequestCacheable(context)) {
      return next.handle();
    }

    const cacheKey = this.trackBy(context);
    if (!cacheKey) {
      return next.handle();
    }

    return from(this.cacheManager.get(cacheKey)).pipe(
      mergeMap((cached) => {
        if (cached !== undefined && cached !== null) {
          if (
            cached !== null &&
            typeof cached === 'object' &&
            '__cacheValue' in cached
          ) {
            return of((cached as { __cacheValue: unknown }).__cacheValue);
          }
          return of(cached);
        }

        return next.handle().pipe(
          tap((response) => {
            const httpResponse = context.switchToHttp().getResponse<{
              statusCode?: number;
            }>();
            if (!this.isResponseCacheable(httpResponse)) {
              return;
            }

            const cacheSizeHint = estimatePayloadSize(response);
            void this.cacheManager.set(cacheKey, {
              __cacheValue: response,
              __cacheSizeHint: cacheSizeHint,
            });
          }),
        );
      }),
    );
  }

  isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const method = request.method ?? '';
    const url = request.originalUrl ?? request.url ?? '';
    const path = url.split('?')[0];

    return method.toUpperCase() === 'POST' && path === '/v1/assessor';
  }

  trackBy(context: ExecutionContext): string | undefined {
    if (!this.isRequestCacheable(context)) {
      return undefined;
    }

    const request = context.switchToHttp().getRequest<{
      body?: CreateAssessorDto;
    }>();
    const body = request.body;
    if (!body) {
      return undefined;
    }

    const secret = this.configService.get('ASSESSOR_CACHE_HASH_SECRET');
    if (typeof secret !== 'string' || secret.length === 0) {
      return undefined;
    }

    return createAssessorCacheKey(body, secret, { prefix: 'assessor:' });
  }

  isResponseCacheable(response: { statusCode?: number }): boolean {
    const statusCode = response.statusCode ?? 200;
    return statusCode < 400;
  }
}

const estimatePayloadSize = (payload: unknown): number => {
  if (Buffer.isBuffer(payload)) {
    return payload.length;
  }

  if (typeof payload === 'string') {
    return Buffer.byteLength(payload);
  }

  try {
    return Buffer.byteLength(JSON.stringify(payload));
  } catch {
    return 0;
  }
};
