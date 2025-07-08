import { Test, TestingModule } from '@nestjs/testing';
import { CommonModule } from './common.module';
import { HttpExceptionFilter } from './http-exception.filter';
import { ZodValidationPipe } from './zod-validation.pipe';
import { JsonParserUtil } from './json-parser.util';

describe('CommonModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [HttpExceptionFilter, ZodValidationPipe, JsonParserUtil],
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
