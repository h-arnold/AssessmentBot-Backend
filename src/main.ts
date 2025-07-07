import { NestFactory } from '@nestjs/core';
<<<<<<< HEAD

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ZodValidationPipe } from './common/zod-validation.pipe';

=======

import { AppModule } from './app.module';

>>>>>>> c166268 (Fix: Resolve ESLint security and pre-commit hook blockers)
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.listen(3000);
}
bootstrap();
