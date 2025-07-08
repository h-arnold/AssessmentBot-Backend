import { PipeTransform, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = 'Validation failed';
        const validationErrors = error.errors;
        this.logger.warn(`${errorMessage}: ${JSON.stringify(validationErrors)}`);
        throw new BadRequestException({ message: errorMessage, errors: validationErrors });
      }

      this.logger.error('An unexpected error occurred during validation', error.stack);
      throw new BadRequestException('Validation failed');
    }
  }
}