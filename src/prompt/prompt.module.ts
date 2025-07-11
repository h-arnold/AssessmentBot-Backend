import { Module } from '@nestjs/common';

import { PromptFactory } from './prompt.factory';

/**
 * The `PromptModule` is a NestJS module responsible for managing the `PromptFactory` provider.
 * It ensures that the `PromptFactory` is available for injection in other parts of the application
 * by exporting it.
 *
 * @module PromptModule
 * @provider PromptFactory - A factory responsible for creating and managing prompt-related functionality.
 * @exports PromptFactory - Makes the `PromptFactory` available for use in other modules.
 */
@Module({
  providers: [PromptFactory],
  exports: [PromptFactory],
})
export class PromptModule {}
