import { IncomingMessage, ServerResponse } from 'http';

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule, Params } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LogRedactor } from './common/utils/log-redactor.util';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { throttlerConfig } from './config/throttler.config';
import { StatusModule } from './status/status.module';
import { AssessorModule } from './v1/assessor/assessor.module';

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
    AuthModule,
    AssessorModule,
    StatusModule,
    ThrottlerModule.forRoot(throttlerConfig),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
