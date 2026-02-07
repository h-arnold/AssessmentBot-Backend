import { ExecutionContext, Injectable } from '@nestjs/common';

import { createAssessorCacheKey } from './cache-key.util';
import { ConfigService } from '../../config/config.service';
import { type CreateAssessorDto } from '../../v1/assessor/dto/create-assessor.dto';


/**
 * Interceptor that determines cacheability for assessor requests.
 * Only POST requests to /v1/assessor are considered cacheable,
 * and only successful (2xx) responses are stored in the cache.
 */
@Injectable()
export class AssessorCacheInterceptor {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
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
}
