import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import Keyv from 'keyv';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';
import {
  resolveAssessorCacheMaxSizeBytes,
  resolveAssessorCacheTtlSeconds,
} from '../../common/cache/assessor-cache.config';
import { AssessorCacheInterceptor } from '../../common/cache/assessor-cache.interceptor';
import { createAssessorCacheStore } from '../../common/cache/assessor-cache.store';
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
 */
@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
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

        return {
          stores: new Keyv({
            store: createAssessorCacheStore({
              ttlMs: ttlSeconds * 1000,
              maxSizeBytes,
            }),
            ttl: ttlSeconds * 1000,
          }),
        };
      },
    }),
    LlmModule,
    PromptModule,
  ],
  controllers: [AssessorController],
  providers: [AssessorService, AssessorCacheInterceptor],
})
export class AssessorModule {}
