import { Module } from '@nestjs/common';

import { PromptFactory } from './prompt.factory';

@Module({
  providers: [PromptFactory],
  exports: [PromptFactory],
})
export class PromptModule {}
