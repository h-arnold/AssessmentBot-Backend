/**
 * Application bootstrapper.
 *
 * Exported function `bootstrap()` can be used to start the NestJS app
 * programmatically (e.g., in tests). The script will also start the
 * application when executed directly with `node dist/src/main.js`.
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

export async function bootstrap(): Promise<void> {
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
  await app.listen(port, '0.0.0.0');
}

// Start the application only when the file is executed directly. This allows tests
// to import `bootstrap` without automatically starting the server, while still
// allowing `node dist/src/main.js` (the test spawn) to start the app even when
// NODE_ENV is set to 'test'.
if (typeof require !== 'undefined' && require.main === module) {
  void bootstrap();
}
