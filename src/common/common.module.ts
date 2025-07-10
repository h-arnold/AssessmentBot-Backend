import { Module } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';
import { JsonParserUtil } from './json-parser.util';
import { ZodValidationPipe } from './zod-validation.pipe';

@Module({
  providers: [HttpExceptionFilter, JsonParserUtil],
  exports: [HttpExceptionFilter, JsonParserUtil],
})
export class CommonModule {}
