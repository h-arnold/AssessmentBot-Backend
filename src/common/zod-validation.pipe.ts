import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      if (!this.schema) {
        return value;
      }
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      this.logger.warn('Validation failed', error.issues);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.issues,
      });
    }
  }
}
