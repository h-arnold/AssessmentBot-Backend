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

import { ASSESSOR_CACHE, AssessorCacheStore } from './assessor-cache.store';
import { createAssessorCacheKey } from './cache-key.util';
import { ConfigService } from '../../config/config.service';
import { type CreateAssessorDto } from '../../v1/assessor/dto/create-assessor.dto';
import { createAssessorDtoSchema } from '../../v1/assessor/dto/create-assessor.dto';
import { ImageValidationPipe } from '../pipes/image-validation.pipe';
import { ZodValidationPipe } from '../zod-validation.pipe';

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
    @Inject(ASSESSOR_CACHE)
    private readonly cacheStore?: AssessorCacheStore,
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
   * Estimates the byte size of a request body for cache eviction purposes.
   * This ensures cache size limits reflect the cost of processing the request,
   * not just the size of the cached response.
   */
  private estimateRequestSize(body: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(body), 'utf8');
    } catch {
      return 1024;
    }
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

    if (!key || !this.cacheStore) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const requestSize = this.estimateRequestSize(request.body);
    const cacheHit = this.cacheStore.has(key);

    if (cacheHit) {
      const validationPipe = new ZodValidationPipe(createAssessorDtoSchema);
      const validatedBody = validationPipe.transform(request.body, {
        type: 'body',
        metatype: null,
        data: '',
      }) as CreateAssessorDto;

      if (validatedBody.taskType === 'IMAGE') {
        const imagePipe = new ImageValidationPipe(this.configService);
        await imagePipe.transform(validatedBody.reference);
        await imagePipe.transform(validatedBody.studentResponse);
        await imagePipe.transform(validatedBody.template);
      }

      const validatedKey = `assessor:${createAssessorCacheKey(
        validatedBody,
        this.secret,
      )}`;
      const cachedValue = this.cacheStore.get<unknown>(validatedKey);
      const remainingTtlMs = this.cacheStore.getRemainingTtl(validatedKey);

      if (cachedValue !== undefined) {
        this.logger.debug(
          `Assessor cache hit for key ${validatedKey}. Remaining TTL=${remainingTtlMs}ms.`,
        );
        return of(cachedValue);
      }

      this.logger.debug(
        `Assessor cache reported hit for key ${validatedKey}, but no value was returned.`,
      );
    }

    this.logger.debug(
      `Assessor cache miss for key ${key}. Request size=${requestSize} bytes.`,
    );

    return next.handle().pipe(
      tap((response) => {
        try {
          const httpResponse = context.switchToHttp().getResponse();
          if (this.isResponseCacheable(httpResponse)) {
            this.cacheStore!.set(key, response, requestSize);
            const remainingTtlMs = this.cacheStore!.getRemainingTtl(key);
            this.logger.debug(
              `Cached assessor response for key ${key}. Remaining TTL=${remainingTtlMs}ms.`,
            );
          } else {
            this.logger.debug(
              `Assessor response not cached for key ${key}. Status=${httpResponse?.statusCode ?? 'unknown'}.`,
            );
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
