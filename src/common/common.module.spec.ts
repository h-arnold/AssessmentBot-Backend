import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';

import { HttpExceptionFilter } from './http-exception.filter';
import { JsonParserUtil } from './json-parser.util';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('CommonModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        HttpExceptionFilter,
        {
          provide: ZodValidationPipe,
          useValue: new ZodValidationPipe(z.any()),
        }, // Provide a mock instance with a valid Zod schema
        JsonParserUtil,
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should export shared providers', () => {
    const filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
    const pipe = module.get<ZodValidationPipe>(ZodValidationPipe);
    const util = module.get<JsonParserUtil>(JsonParserUtil);

    expect(filter).toBeDefined();
    expect(pipe).toBeDefined();
    expect(util).toBeDefined();
  });
});
