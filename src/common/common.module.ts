import { Module } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';
import { JsonParserUtil } from './json-parser.util';
import { ZodValidationPipe } from './zod-validation.pipe';

@Module({
  providers: [HttpExceptionFilter, JsonParserUtil, ZodValidationPipe],
  exports: [HttpExceptionFilter, JsonParserUtil, ZodValidationPipe],
})
export class CommonModule {}
