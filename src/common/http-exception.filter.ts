import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';

@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string = exception instanceof HttpException
      ? (exception.getResponse() as { message: string | string[] }).message || exception.getResponse() as string
      : 'Internal server error';

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
      this.logger.error(`HTTP ${status} - ${message}`, logContext, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json(errorResponse);
  }

  private sanitizeHeaders(headers: Record<string, string | string[]>): Record<string, string | string[]> {
    const sanitizedHeaders = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      if (sanitizedHeaders[header]) {
        sanitizedHeaders[header] = '[REDACTED]';
      }
    });
    return sanitizedHeaders;
  }
}