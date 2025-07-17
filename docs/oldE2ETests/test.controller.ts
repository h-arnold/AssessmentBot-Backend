import {
  Body,
  Controller,
  Get,
  Post,
  UsePipes,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../../src/common/zod-validation.pipe';

// Define a simple DTO for validation testing
const TestDtoSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  age: z.number().int().min(18, 'Age must be at least 18'),
});

type TestDto = z.infer<typeof TestDtoSchema>;

@Controller()
export class TestController {
  @Get('test-error')
  throwError(): void {
    throw new HttpException('This is a test error', HttpStatus.BAD_REQUEST);
  }

  @Post('test-validation')
  @UsePipes(new ZodValidationPipe(TestDtoSchema))
  validatePayload(@Body() payload: TestDto): {
    message: string;
    data: TestDto;
  } {
    return { message: 'Validation successful', data: payload };
  }
}
