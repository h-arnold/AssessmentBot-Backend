/**
 * Bootstraps the NestJS application.
 *
 * This function initializes the application by creating a NestJS instance
 * with the `AppModule`. It configures the application with custom middleware
 * and global filters, and starts the server on port 3000.
 *
 * Steps performed:
 * - Loads environment variables using `dotenv`.
 * - Creates a NestJS application instance with `bodyParser` disabled.
 * - Retrieves the global payload limit from the `ConfigService` and applies it
 *   to the JSON body parser middleware.
 * - Sets up a global exception filter using `HttpExceptionFilter`.
 * - Starts the application server on port 3000.
 *
 * @async
 * @function bootstrap
 * @returns {Promise<void>} A promise that resolves when the application is successfully started.
 */
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { json } from 'express';

dotenv.config();

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ConfigService } from './config/config.service';

/**
 * Initializes and starts the NestJS application.
 *
 * This function sets up the application by creating an instance of the AppModule,
 * configuring the global payload limit for JSON requests, applying global filters,
 * and starting the server to listen on port 3000.
 *
 * @async
 * @function bootstrap
 * @returns {Promise<void>} A promise that resolves when the application is successfully started.
 *
 * @remarks
 * - The `bodyParser` option is disabled during the creation of the application.
 * - The payload limit for JSON requests is retrieved from the `ConfigService`.
 * - An instance of `HttpExceptionFilter` is applied globally to handle exceptions.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const configService = app.get(ConfigService);
  const payloadLimit = configService.getGlobalPayloadLimit();
  app.use(json({ limit: payloadLimit }));

  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
bootstrap();
