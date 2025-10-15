/**
 * Bootstraps the NestJS application.
 *
 * **REVIEW REQUIRED** This comment needs verification of implementation details.
 *
 * This function initialises the application by creating a NestJS instance
 * with the `AppModule`. It configures the application with logging,
 * request parsing, and starts the server.
 *
 * Steps performed:
 * - Loads environment variables using `dotenv` (test vs production)
 * - Creates a NestJS application instance with logging configuration
 * - Sets up Express query parser to 'extended' mode
 * - Configures JSON body parser with size limits from ConfigService
 * - Starts the application server on the configured port
 *
 * @async
 * @function bootstrap
 * @returns {Promise<void>} A promise that resolves when the application is successfully started.
 */
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { json } from 'express';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

// Load environment variables - use .test.env for test environment
const envFile = process.env.NODE_ENV === 'test' ? '.test.env' : '.env';
dotenv.config({ path: envFile });

import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

/**
 * Initialises and starts the NestJS application.
 *
 * **REVIEW REQUIRED** This appears to be a duplicate comment with inaccuracies.
 *
 * This function sets up the application by creating an instance of the AppModule,
 * configuring logging, request parsing, and starting the server on the configured port.
 *
 * @async
 * @function bootstrap
 * @returns {Promise<void>} A promise that resolves when the application is successfully started.
 *
 * @remarks
 * - Logging is configured based on E2E testing environment
 * - Express query parser is set to 'extended' mode for compatibility
 * - JSON payload limit is retrieved from the `ConfigService`
 * - Global exception handling is configured via AppModule, not here directly
 */
async function bootstrap(): Promise<void> {
  const isE2ETesting = process.env.E2E_TESTING === 'true';
  const app = await NestFactory.create(AppModule, {
    bufferLogs: !isE2ETesting, // Disable bufferLogs during E2E tests
  });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Set Express query parser to 'extended' for compatibility with qs-style query strings
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('query parser', 'extended');

  const configService = app.get(ConfigService);
  const payloadLimit = configService.getGlobalPayloadLimit();
  const port = configService.get('PORT');

  app.use(json({ limit: payloadLimit }));

  // Bind to all interfaces so remote port-forwarding (Codespaces, containers)
  // can reach the server. Some environments require an explicit host.
  await app.listen(port);
}
bootstrap();
