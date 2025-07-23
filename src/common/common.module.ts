import { Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

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
  imports: [LoggerModule],
  providers: [
    Logger,
    JsonParserUtil,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  exports: [Logger, JsonParserUtil],
})
export class CommonModule {}
