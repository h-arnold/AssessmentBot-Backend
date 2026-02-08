import { HttpException, HttpStatus, Logger } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';
import { createHttpArgumentsHost } from '../../test/utils/http-mocks';
import { ResourceExhaustedError } from '../llm/resource-exhausted.error';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    filter = new HttpExceptionFilter(logger);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle ResourceExhaustedError and return 503', () => {
    const resourceExhaustedError = new ResourceExhaustedError(
      'Quota has been exceeded.',
    );
    const { argumentsHost, json, status } = createHttpArgumentsHost({
      method: 'POST',
      url: '/test-resource-exhausted',
    });
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();

    filter.catch(resourceExhaustedError, argumentsHost);

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Quota has been exceeded.',
      timestamp: expect.any(String),
      path: '/test-resource-exhausted',
    });
    expect(loggerSpy).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/test-resource-exhausted',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
      `HTTP ${HttpStatus.SERVICE_UNAVAILABLE} - Quota has been exceeded.`,
      expect.any(String),
    );
  });

  it('should handle Express PayloadTooLargeError and return 413', () => {
    // Simulate Express body-parser PayloadTooLargeError
    const payloadTooLargeError = {
      type: 'entity.too.large',
      message: 'request entity too large',
    };
    const { argumentsHost, json, status } = createHttpArgumentsHost({
      method: 'POST',
      url: '/test-large',
    });
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    filter.catch(payloadTooLargeError, argumentsHost);

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'Payload Too Large',
      timestamp: expect.any(String),
      path: '/test-large',
    });
    expect(loggerSpy).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/test-large',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
      `HTTP ${HttpStatus.PAYLOAD_TOO_LARGE} - Payload Too Large`,
    );
  });

  it('should format custom error response with timestamp and path', () => {
    // Create a test exception with a custom message and status
    const exception = new HttpException(
      'Test Exception',
      HttpStatus.BAD_REQUEST,
    );
    const { argumentsHost, json, status } = createHttpArgumentsHost({
      method: 'POST',
      url: '/test',
    });
    // Call the filter's catch method with the mocked exception and arguments host
    filter.catch(exception, argumentsHost);
    // Assert that the response was set with the correct status and message
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Test Exception',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should include Zod errors and join array messages', () => {
    const exception = new HttpException(
      {
        message: ['First issue', 'Second issue'],
        errors: [
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['field'],
            message: 'Expected string',
          },
        ],
      },
      HttpStatus.BAD_REQUEST,
    );
    const { argumentsHost, json, status } = createHttpArgumentsHost({
      method: 'POST',
      url: '/test-zod',
    });

    filter.catch(exception, argumentsHost);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'First issue, Second issue',
      timestamp: expect.any(String),
      path: '/test-zod',
      errors: [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field'],
          message: 'Expected string',
        },
      ],
    });
  });

  it('should redact sensitive headers in warning logs', () => {
    const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    const { argumentsHost } = createHttpArgumentsHost({
      method: 'POST',
      url: '/test-redact',
      headers: {
        'user-agent': 'jest',
        authorization: 'Bearer secret',
        cookie: 'session=secret',
        'x-api-key': 'secret',
      },
    });
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    filter.catch(exception, argumentsHost);

    expect(loggerSpy).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/test-redact',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'jest',
          authorization: '[REDACTED]',
          cookie: '[REDACTED]',
          'x-api-key': '[REDACTED]',
        },
        userAgent: 'jest',
      },
      `HTTP ${HttpStatus.BAD_REQUEST} - Bad Request`,
    );
  });

  it('should sanitise production 5xx error messages', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const exception = new HttpException(
      'Sensitive details',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const { argumentsHost, json } = createHttpArgumentsHost({
      method: 'GET',
      url: '/test-production',
    });

    filter.catch(exception, argumentsHost);

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: expect.any(String),
      path: '/test-production',
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should sanitise sensitive messages in production', () => {
    const exception = new HttpException(
      'Internal database error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const { argumentsHost, json, status } = createHttpArgumentsHost({
      method: 'POST',
      url: '/test',
    });

    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    filter.catch(exception, argumentsHost);

    process.env.NODE_ENV = originalNodeEnv;

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should include request context in logs', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const { argumentsHost } = createHttpArgumentsHost({
      method: 'GET',
      url: '/not-found',
    });
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    filter.catch(exception, argumentsHost);

    expect(loggerSpy).toHaveBeenCalledWith(
      {
        method: 'GET',
        path: '/not-found',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
      `HTTP ${HttpStatus.NOT_FOUND} - Not Found`,
    );
  });

  it('should log not found errors with warn level', () => {
    // This test checks that 404 errors are logged with warn level
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const { argumentsHost } = createHttpArgumentsHost({
      method: 'GET',
      url: '/not-found',
    });
    // Call the filter's catch method and check that the logger was called with the expected arguments
    filter.catch(exception, argumentsHost);
    expect(loggerSpy).toHaveBeenCalledWith(
      {
        method: 'GET',
        path: '/not-found',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
      `HTTP ${HttpStatus.NOT_FOUND} - Not Found`,
    );
  });

  it('should use error level for 5xx errors', () => {
    // This test checks that 5xx errors are logged with error level
    const exception = new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    const { argumentsHost } = createHttpArgumentsHost({
      method: 'GET',
      url: '/error',
    });
    // Call the filter's catch method and check that the logger was called with the expected arguments
    filter.catch(exception, argumentsHost);
    expect(loggerSpy).toHaveBeenCalledWith(
      {
        method: 'GET',
        path: '/error',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
      `HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} - Internal server error`,
      expect.any(String), // Accept any stack trace as the third argument
    );
  });
});
