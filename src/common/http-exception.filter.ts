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
    interface ZodErrorDetail {
      code: string;
      expected?: string;
      received?: string;
      path: (string | number)[];
      message: string;
    }

    let errors: ZodErrorDetail[] | undefined; // Add a variable for errors

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse(); // Rename to avoid conflict
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        // Extract message
        if ('message' in exceptionResponse) {
          const msg = (exceptionResponse as { message: string | string[] })
            .message;
          message = Array.isArray(msg) ? msg.join(', ') : msg;
        } else {
          message = 'Internal server error'; // Default if no message
        }

        // Extract errors if present (for validation errors)
        if (
          'errors' in exceptionResponse &&
          Array.isArray(
            (exceptionResponse as { errors: ZodErrorDetail[] }).errors,
          )
        ) {
          errors = (exceptionResponse as { errors: ZodErrorDetail[] }).errors;
        }
      } else {
        message = 'Internal server error';
      }
    } else {
      message = 'Internal server error';
    }

    // Sanitise sensitive messages in production
    if (process.env.NODE_ENV === 'production' && status >= 500) {
      message = 'Internal server error';
    }

    const errorResponse: Record<string, unknown> = {
      // Use unknown for more strict typing
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    };

    if (errors) {
      // Add errors to the response if they exist
      errorResponse.errors = errors;
    }

    const logContext = {
      method: request.method,
      path: request.url,
      ip: request.ip,
      headers: this.sanitiseHeaders(request.headers),
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

  private sanitiseHeaders(
    headers: Record<string, string | string[]>,
  ): Record<string, string | string[]> {
    const result = { ...headers };
    if ('authorization' in result) result['authorization'] = '[REDACTED]';
    if ('cookie' in result) result['cookie'] = '[REDACTED]';
    if ('x-api-key' in result) result['x-api-key'] = '[REDACTED]';
    return result;
  }
}
