import { IncomingMessage, ServerResponse } from 'http';

// Type guard to check if req has an id property of type string or number
function hasReqId(
  req: IncomingMessage,
): req is IncomingMessage & { id: string | number } {
  const maybeReq = req as unknown as { id?: unknown };
  return (
    Object.prototype.hasOwnProperty.call(maybeReq, 'id') &&
    (typeof maybeReq.id === 'string' || typeof maybeReq.id === 'number')
  );
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule, Params } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeyThrottlerGuard } from './auth/api-key-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LogRedactor } from './common/utils/log-redactor.util';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { AssessorModule } from './v1/assessor/assessor.module';

/**
 * The main application module that serves as the entry point for the backend application.
 *
 * @module AppModule
 * @description
 * This module imports essential feature modules and configuration modules required for the application.
 * It also defines the controllers and providers that will be used throughout the application.
 *
 * @imports
 * - `ConfigModule`: Handles application configuration and environment variables.
 * - `CommonModule`: Provides shared utilities and services across the application.
 * - `AuthModule`: Manages authentication and authorization functionalities.
 * - `AssessorModule`: Contains logic related to assessors and their operations.
 *
 * @controllers
 * - `AppController`: The main controller for handling application-level requests.
 *
 * @providers
 * - `AppService`: The primary service for application-level business logic.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Params => {
        const logLevel = configService.get('LOG_LEVEL');
        const logFile = process.env.LOG_FILE;

        if (logFile) {
          // For E2E tests: write JSON logs to file
          return {
            pinoHttp: {
              level: logLevel,
              transport: {
                target: 'pino/file',
                options: {
                  destination: logFile,
                },
              },
              serializers: {
                req: (req: IncomingMessage): IncomingMessage =>
                  LogRedactor.redactRequest(req),
              },
              customProps: (
                req: IncomingMessage,
                _res: ServerResponse<IncomingMessage>,
              ): { reqId: string | number | undefined } => {
                let reqId: string | number | undefined = undefined;
                if (hasReqId(req)) {
                  reqId = req.id;
                }
                return {
                  reqId,
                };
              },
            },
          };
        } else {
          // For development: use pino-pretty for console output
          return {
            pinoHttp: {
              level: logLevel,
              transport: {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              },
              serializers: {
                req: (req: IncomingMessage): IncomingMessage =>
                  LogRedactor.redactRequest(req),
              },
            },
          };
        }
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('THROTTLER_TTL'),
          limit: configService.get('THROTTLER_LIMIT'),
        },
      ],
    }),
    CommonModule,
    AuthModule,
    AssessorModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyThrottlerGuard,
    },
  ],
})
export class AppModule {}
