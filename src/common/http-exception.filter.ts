import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const message = process.env.NODE_ENV === 'production' && status >= 500
        ? 'Internal server error'
        : exception.message;

    const logContext = {
      statusCode: status,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      stack: exception.stack,
    };

    const logMessage = `[HTTP Exception] ${request.method} ${request.url}`;

    if (status >= 500) {
      this.logger.error(logMessage, JSON.stringify(logContext));
    } else {
      this.logger.warn(logMessage, JSON.stringify(logContext));
    }

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message,
      });
  }
}