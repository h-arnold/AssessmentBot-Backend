import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';

dotenv.config();

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
bootstrap();
