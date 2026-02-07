import { Module } from '@nestjs/common';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';
import {
  resolveAssessorCacheTtlSeconds,
  resolveAssessorCacheMaxSizeBytes,
} from '../../common/cache/assessor-cache.config';
import { AssessorCacheInterceptor } from '../../common/cache/assessor-cache.interceptor';
import {
  ASSESSOR_CACHE,
  AssessorCacheStore,
} from '../../common/cache/assessor-cache.store';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';
import { LlmModule } from '../../llm/llm.module';
import { PromptModule } from '../../prompt/prompt.module';

/**
 * The `AssessorModule` is a NestJS module that encapsulates the functionality
 * related to the assessor feature in the application. It imports necessary
 * modules, defines controllers, and provides services required for the
 * assessor functionality.
 *
 * @module AssessorModule
 * @imports ConfigModule - Handles application configuration settings.
 * @imports LlmModule - Provides functionality related to large language models.
 * @imports PromptModule - Manages prompt-related operations.
 * @controllers AssessorController - Handles HTTP requests for assessor-related operations.
 * @providers AssessorService - Contains business logic for assessor functionality.
 * @providers AssessorCacheInterceptor - Caches assessor responses in memory.
 */
@Module({
  imports: [ConfigModule, LlmModule, PromptModule],
  controllers: [AssessorController],
  providers: [
    AssessorService,
    {
      provide: ASSESSOR_CACHE,
      useFactory: (configService: ConfigService): AssessorCacheStore => {
        const ttlSeconds = resolveAssessorCacheTtlSeconds({
          ASSESSOR_CACHE_TTL_HOURS: configService.get(
            'ASSESSOR_CACHE_TTL_HOURS',
          ),
          ASSESSOR_CACHE_TTL_MINUTES: configService.get(
            'ASSESSOR_CACHE_TTL_MINUTES',
          ),
        });
        const maxSizeBytes = resolveAssessorCacheMaxSizeBytes({
          ASSESSOR_CACHE_MAX_SIZE_MIB: configService.get(
            'ASSESSOR_CACHE_MAX_SIZE_MIB',
          ),
        });
        return new AssessorCacheStore(maxSizeBytes, ttlSeconds * 1000);
      },
      inject: [ConfigService],
    },
    AssessorCacheInterceptor,
  ],
})
export class AssessorModule {}
