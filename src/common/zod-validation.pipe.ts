import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ZodTypeAny, ZodError } from 'zod';

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
