import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ZodTypeAny, ZodError } from 'zod';

/**
 * A custom validation pipe that uses Zod schemas to validate incoming data.
 * This pipe is designed to be used with NestJS and implements the `PipeTransform` interface.
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 * const validationPipe = new ZodValidationPipe(schema);
 * ```
 *
 * @remarks
 * - If the schema is not provided, the pipe will simply return the input value without validation.
 * - In production mode, validation errors are masked with a generic message for security purposes.
 * - In non-production mode, detailed validation issues are logged and returned.
 *
 * @constructor
 * @param schema - The Zod schema used for validation.
 *
 * @method transform
 * Validates the input value against the provided Zod schema.
 * If validation fails, it throws a `BadRequestException` with the validation errors.
 *
 * @param value - The value to be validated.
 * @param metadata - Metadata about the argument being processed.
 * @returns The parsed value if validation succeeds.
 * @throws `BadRequestException` if validation fails.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodTypeAny) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    try {
      if (!this.schema) {
        return value;
      }
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errors =
          process.env.NODE_ENV === 'production'
            ? [{ message: 'Invalid input' }]
            : error.issues;
        this.logger.warn('Validation failed', errors);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: errors,
        });
      } else {
        this.logger.warn('Validation failed', error);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error,
        });
      }
    }
  }
}
