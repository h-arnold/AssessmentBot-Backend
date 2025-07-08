import { BadRequestException, Logger, ArgumentMetadata } from '@nestjs/common';
import * as z from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string(),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should throw BadRequestException on invalid data', () => {
    const invalidData = { name: 123 };
    expect(() => pipe.transform(invalidData, {} as ArgumentMetadata)).toThrow(
      BadRequestException,
    );
  });

  it('should return transformed data on valid payload', () => {
    const validData = { name: 'test' };
    expect(pipe.transform(validData, {} as ArgumentMetadata)).toEqual(validData);
  });

  it('should handle edge cases for empty and null values', () => {
    expect(() => pipe.transform(null, {} as ArgumentMetadata)).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform(undefined, {} as ArgumentMetadata)).toThrow(
      BadRequestException,
    );
  });

  describe('array validation', () => {
    const arraySchema = z.array(z.string());
    let arrayPipe: ZodValidationPipe;

    beforeEach(() => {
      arrayPipe = new ZodValidationPipe(arraySchema);
    });

    it('should validate a valid array', () => {
      const validData = ['a', 'b', 'c'];
      expect(arrayPipe.transform(validData, {} as ArgumentMetadata)).toEqual(validData);
    });

    it('should throw BadRequestException on an invalid array', () => {
      const invalidData = ['a', 1, 'c'];
      expect(() => arrayPipe.transform(invalidData, {} as ArgumentMetadata)).toThrow(
        BadRequestException,
      );
    });
  });

  it('should log validation failures', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const invalidData = { name: 123 };
    expect(() => pipe.transform(invalidData, {} as ArgumentMetadata)).toThrow(
      BadRequestException,
    );
    expect(loggerSpy).toHaveBeenCalled();
  });
});