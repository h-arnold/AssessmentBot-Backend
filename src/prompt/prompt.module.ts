import { Logger, Module } from '@nestjs/common';

import { PromptFactory } from './prompt.factory';

@Module({
  providers: [PromptFactory, Logger],
  exports: [PromptFactory],
})
export class PromptModule {}
