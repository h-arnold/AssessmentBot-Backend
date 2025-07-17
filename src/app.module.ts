import { IncomingMessage } from 'http';

import { Module } from '@nestjs/common';
import { LoggerModule, Params } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { AssessorModule } from './v1/assessor/assessor.module';

/**
 * Helper function to create a sanitized copy of the request for logging purposes.
 * This ensures that sensitive information like authorization headers are redacted
 * in logs without modifying the original request object.
 *
 * @param req - The original IncomingMessage request object
 * @returns A sanitized copy of the request suitable for logging
 */
function createSanitizedRequestForLogging(
  req: IncomingMessage,
): Partial<IncomingMessage> {
  const sanitizedReq = { ...req };

  // Create a copy of headers to avoid modifying the original
  if (req.headers) {
    sanitizedReq.headers = { ...req.headers };
    if (sanitizedReq.headers.authorization) {
      sanitizedReq.headers.authorization = 'Bearer <redacted>';
    }
  }

  return sanitizedReq;
}

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
        const e2eTesting = process.env.E2E_TESTING;

        if (logFile) {
          // For E2E tests with file output: write JSON logs to file
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
                req: createSanitizedRequestForLogging,
              },
            },
          };
        } else if (e2eTesting) {
          // For E2E tests with console output: write JSON logs to console
          return {
            pinoHttp: {
              level: logLevel,
              serializers: {
                req: createSanitizedRequestForLogging,
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
                req: createSanitizedRequestForLogging,
              },
            },
          };
        }
      },
    }),
    CommonModule,
    AuthModule,
    AssessorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
