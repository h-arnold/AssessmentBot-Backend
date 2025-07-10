import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { json } from 'express';

dotenv.config();

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ConfigService } from './config/config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const configService = app.get(ConfigService);
  const payloadLimit = configService.getGlobalPayloadLimit();
  app.use(json({ limit: payloadLimit }));

  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
bootstrap();
