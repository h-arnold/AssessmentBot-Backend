import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';

import { createAssessorCacheKey } from './cache-key.util';
import { ConfigService } from '../../config/config.service';
import { type CreateAssessorDto } from '../../v1/assessor/dto/create-assessor.dto';

/**
 * Cache interface matching cache-manager's Cache type.
 * Kept minimal to avoid importing the full cache-manager module in unit tests.
 */
interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<T>;
}

/**
 * Interceptor that provides in-memory caching for assessor requests.
 * Only POST requests to /v1/assessor are considered cacheable,
 * and only successful (2xx) responses are stored in the cache.
 */
@Injectable()
export class AssessorCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AssessorCacheInterceptor.name);
  private readonly secret: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(CACHE_MANAGER)
    private readonly cacheManager?: CacheStore,
  ) {
    this.secret = this.configService.get('ASSESSOR_CACHE_HASH_SECRET');
  }

  /**
   * Determines whether the incoming request is eligible for caching.
   * Only POST /v1/assessor requests are cacheable.
   */
  isRequestCacheable(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest();
    const url: string = request.originalUrl ?? request.url ?? '';
    return request.method === 'POST' && url.includes('/v1/assessor');
  }

  /**
   * Generates a unique cache key for cacheable requests.
   * Returns undefined for non-cacheable requests.
   */
  trackBy(ctx: ExecutionContext): string | undefined {
    if (!this.isRequestCacheable(ctx)) {
      return undefined;
    }

    const request = ctx.switchToHttp().getRequest();
    const body = request.body as CreateAssessorDto;
    const hash = createAssessorCacheKey(body, this.secret);
    return `assessor:${hash}`;
  }

  /**
   * Determines whether a response should be stored in the cache.
   * Only 2xx status codes are cacheable.
   */
  isResponseCacheable(response: { statusCode?: number }): boolean {
    const statusCode = response.statusCode ?? 0;
    return statusCode >= 200 && statusCode < 300;
  }

  /**
   * Intercepts HTTP requests to provide caching behaviour.
   * Checks the cache before proceeding to the handler and caches
   * successful responses for future identical requests.
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const key = this.trackBy(context);

    if (!key || !this.cacheManager) {
      return next.handle();
    }

    try {
      const cached = await this.cacheManager.get(key);
      if (cached !== undefined && cached !== null) {
        this.logger.debug('Cache hit for assessor request.');
        return of(cached);
      }
    } catch (error) {
      this.logger.warn(
        'Cache lookup failed; proceeding without cache.',
        error instanceof Error ? error.message : String(error),
      );
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const httpResponse = context.switchToHttp().getResponse();
          if (this.isResponseCacheable(httpResponse)) {
            await this.cacheManager!.set(key, response);
            this.logger.debug('Cached assessor response.');
          }
        } catch (error) {
          this.logger.warn(
            'Failed to cache assessor response.',
            error instanceof Error ? error.message : String(error),
          );
        }
      }),
    );
  }
}
