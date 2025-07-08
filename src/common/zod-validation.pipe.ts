import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
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
        this.logger.warn('Validation failed', error.issues);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.issues,
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
