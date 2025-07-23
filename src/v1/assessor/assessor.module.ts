import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';
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
    LlmModule,
    PromptModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Get the authenticated
        throttlers: [
          {
            ttl: configService.get('THROTTLER_TTL'),
            limit: configService.get('AUTHENTICATED_THROTTLER_LIMIT'),
          },
        ],
      }),
    }),
  ],
  controllers: [AssessorController],
  providers: [AssessorService],
})
export class AssessorModule {}
