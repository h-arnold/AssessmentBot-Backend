import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { type Cache } from 'cache-manager';

import { createAssessorCacheKey } from 'src/common/utils/assessor-cache-key.util';
import { ConfigService } from 'src/config/config.service';

interface CacheableRequest {
  method?: string;
  url?: string;
  body?: unknown;
}

@Injectable()
export class AssessorCacheInterceptor extends CacheInterceptor {
  private readonly logger = new Logger(AssessorCacheInterceptor.name);

  constructor(
    cacheManager: Cache,
    reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(cacheManager, reflector);
  }

  protected isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CacheableRequest>();
    return request.method === 'POST' && request.url === '/v1/assessor';
  }

  protected trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<CacheableRequest>();
    if (!request.body) {
      this.logger.debug('Cache skipped: missing request body.');
      return undefined;
    }

    const secret = this.configService.get('CACHE_KEY_SECRET');
    if (!secret) {
      this.logger.warn('Cache skipped: CACHE_KEY_SECRET is not configured.');
      return undefined;
    }

    return createAssessorCacheKey(request.body as never, secret);
  }
}
