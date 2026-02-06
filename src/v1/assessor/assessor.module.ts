import { Module } from '@nestjs/common';

import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';
import { ConfigModule } from '../../config/config.module';
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
  imports: [ConfigModule, LlmModule, PromptModule],
  controllers: [AssessorController],
  providers: [AssessorService],
})
export class AssessorModule {}
