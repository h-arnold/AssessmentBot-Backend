import { Logger, Module } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';
import { JsonParserUtil } from './json-parser.util';

/**
 * The `CommonModule` is a NestJS module that provides common utilities and filters
 * to be used across the application. It includes the following:
 *
 * - `HttpExceptionFilter`: A filter for handling HTTP exceptions globally.
 * - `JsonParserUtil`: A utility for parsing JSON data.
 *
 * Both `HttpExceptionFilter` and `JsonParserUtil` are provided and exported,
 * making them available for use in other modules that import `CommonModule`.
 */
@Module({
  providers: [HttpExceptionFilter, JsonParserUtil, Logger],
  exports: [HttpExceptionFilter, JsonParserUtil, Logger],
})
export class CommonModule {}
