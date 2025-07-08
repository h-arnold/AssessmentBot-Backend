import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';

@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const msg = (response as { message: string | string[] }).message;
        message = Array.isArray(msg) ? msg.join(', ') : msg;
      } else {
        message = 'Internal server error';
      }
    } else {
      message = 'Internal server error';
    }

    // Sanitize sensitive messages in production
    if (process.env.NODE_ENV === 'production' && status >= 500) {
      message = 'Internal server error';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    };

    const logContext = {
      method: request.method,
      path: request.url,
      ip: request.ip,
      headers: this.sanitizeHeaders(request.headers),
      userAgent: request.headers['user-agent'],
    };

    if (status >= 400 && status < 500) {
      this.logger.warn(`HTTP ${status} - ${message}`, logContext);
    } else if (status >= 500) {
      this.logger.error(
        `HTTP ${status} - ${message}`,
        logContext,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(errorResponse);
  }

  private sanitizeHeaders(
    headers: Record<string, string | string[]>,
  ): Record<string, string | string[]> {
    const result = { ...headers };
    if ('authorization' in result) result['authorization'] = '[REDACTED]';
    if ('cookie' in result) result['cookie'] = '[REDACTED]';
    if ('x-api-key' in result) result['x-api-key'] = '[REDACTED]';
    return result;
  }
}
